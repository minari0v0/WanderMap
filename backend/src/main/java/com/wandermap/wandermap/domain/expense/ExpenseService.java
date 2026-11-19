package com.wandermap.wandermap.domain.expense;

import com.wandermap.wandermap.domain.auth.User;
import com.wandermap.wandermap.domain.auth.UserRepository;
import com.wandermap.wandermap.domain.trip.Trip;
import com.wandermap.wandermap.domain.trip.TripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExpenseService {

    private static final String PAYER_UNSPECIFIED = "UNSPECIFIED";
    private static final String PAYER_SHARED = "SHARED";
    private static final String PAYER_MEMBER = "MEMBER";
    private static final String DEFAULT_CURRENCY = "KRW";
    private static final Set<String> SUPPORTED_CURRENCIES = Set.of(
            "KRW", "JPY", "USD", "EUR", "TWD", "THB", "VND", "GBP", "CNY"
    );

    private final TripExpenseRepository tripExpenseRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;

    public TripExpenseSummaryResponse getTripExpenses(Long tripId) {
        Trip trip = getTrip(tripId);
        List<TripExpense> expenses = tripExpenseRepository.findByTripIdOrderByDayNumberAscCreatedAtAsc(tripId);
        return buildSummaryResponse(trip, expenses);
    }

    @Transactional
    public TripExpenseSummaryResponse addExpense(Long tripId, CreateExpenseRequest req, Long userId) {
        User creator = requireAuthenticatedUser(userId);
        Trip trip = getTrip(tripId);

        if (req == null) {
            throw new IllegalArgumentException("지출 정보를 입력해 주세요.");
        }
        if (req.getDayNumber() == null || req.getDayNumber() < 1) {
            throw new IllegalArgumentException("유효한 일차(Day)를 입력해 주세요.");
        }
        if (req.getTitle() == null || req.getTitle().isBlank()) {
            throw new IllegalArgumentException("지출 항목명을 입력해 주세요.");
        }
        String trimmedTitle = req.getTitle().trim();
        if (trimmedTitle.length() > 120) {
            throw new IllegalArgumentException("지출 항목명은 120자 이하로 입력해 주세요.");
        }
        if (req.getAmount() == null || req.getAmount() <= 0) {
            throw new IllegalArgumentException("지출 금액은 1원 이상이어야 합니다.");
        }

        String currency = normalizeCurrency(req.getCurrency());
        String payerType = normalizePayerType(req.getPayerType());
        User payerUser = null;
        String payerName = null;

        if (PAYER_MEMBER.equals(payerType)) {
            if (req.getPayerUserId() != null) {
                payerUser = userRepository.findById(req.getPayerUserId())
                        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 결제자입니다. ID: " + req.getPayerUserId()));
                payerName = truncate(payerUser.getNickname(), 60);
            } else if (req.getPayerName() != null && !req.getPayerName().isBlank()) {
                payerName = truncate(req.getPayerName().trim(), 60);
            }
        } else if (req.getPayerName() != null && !req.getPayerName().isBlank()) {
            payerName = truncate(req.getPayerName().trim(), 60);
        }

        TripExpense expense = TripExpense.builder()
                .trip(trip)
                .dayNumber(req.getDayNumber())
                .title(trimmedTitle)
                .amount(req.getAmount())
                .currency(currency)
                .payerType(payerType)
                .payerUser(payerUser)
                .payerName(payerName)
                .createdBy(creator)
                .build();

        tripExpenseRepository.saveAndFlush(expense);
        return getTripExpenses(tripId);
    }

    @Transactional
    public TripExpenseSummaryResponse deleteExpense(Long tripId, Long expenseId, Long userId) {
        requireAuthenticatedUser(userId);
        getTrip(tripId);

        TripExpense expense = tripExpenseRepository.findById(expenseId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 지출 내역입니다. ID: " + expenseId));

        if (expense.getTrip() == null || !tripId.equals(expense.getTrip().getId())) {
            throw new IllegalArgumentException("해당 여행 방의 지출 내역이 아닙니다.");
        }

        tripExpenseRepository.delete(expense);
        tripExpenseRepository.flush();
        return getTripExpenses(tripId);
    }

    private TripExpenseSummaryResponse buildSummaryResponse(Trip trip, List<TripExpense> expenses) {
        LocalDate start = trip.getStartDate() != null ? trip.getStartDate() : LocalDate.now();
        LocalDate end = trip.getEndDate() != null ? trip.getEndDate() : start;
        long rawDays = ChronoUnit.DAYS.between(start, end) + 1;
        int totalDays = (int) Math.max(1, Math.min(30, rawDays));

        Set<Integer> dayNumbers = new TreeSet<>();
        for (int i = 1; i <= totalDays; i++) {
            dayNumbers.add(i);
        }
        for (TripExpense e : expenses) {
            if (e.getDayNumber() != null && e.getDayNumber() >= 1) {
                dayNumbers.add(e.getDayNumber());
            }
        }

        Map<Integer, List<TripExpense>> expensesByDay = expenses.stream()
                .collect(Collectors.groupingBy(
                        TripExpense::getDayNumber,
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        long tripTotalAmount = 0L;
        Map<String, Long> tripTotalsByCurrency = new LinkedHashMap<>();
        List<TripExpenseSummaryResponse.DaySummary> daySummaries = new ArrayList<>(dayNumbers.size());

        for (Integer dayNumber : dayNumbers) {
            List<TripExpense> dayExpenses = expensesByDay.getOrDefault(dayNumber, Collections.emptyList());

            long dayTotal = 0L;
            long sharedTotal = 0L;
            long unspecifiedTotal = 0L;
            Map<String, Long> dayTotalsByCurrency = new LinkedHashMap<>();
            Map<String, Long> sharedTotalsByCurrency = new LinkedHashMap<>();
            Map<String, MemberAccumulator> memberAccumulators = new LinkedHashMap<>();
            List<TripExpenseSummaryResponse.ExpenseItem> items = new ArrayList<>(dayExpenses.size());

            for (TripExpense e : dayExpenses) {
                long amount = e.getAmount() != null ? e.getAmount() : 0L;
                String currency = normalizeCurrency(e.getCurrency());
                String payerType = normalizePayerType(e.getPayerType());
                Long payerUserId = e.getPayerUser() != null ? e.getPayerUser().getId() : null;
                String payerLabel = resolvePayerLabel(e, payerType);

                dayTotal += amount;
                dayTotalsByCurrency.merge(currency, amount, Long::sum);
                tripTotalsByCurrency.merge(currency, amount, Long::sum);

                if (PAYER_SHARED.equals(payerType)) {
                    sharedTotal += amount;
                    sharedTotalsByCurrency.merge(currency, amount, Long::sum);
                } else if (PAYER_MEMBER.equals(payerType)) {
                    String key = payerUserId != null ? "U:" + payerUserId : "N:" + payerLabel;
                    MemberAccumulator acc = memberAccumulators.computeIfAbsent(
                            key,
                            k -> new MemberAccumulator(payerUserId, payerLabel)
                    );
                    acc.amount += amount;
                    acc.totalsByCurrency.merge(currency, amount, Long::sum);
                } else {
                    unspecifiedTotal += amount;
                }

                items.add(TripExpenseSummaryResponse.ExpenseItem.builder()
                        .id(e.getId())
                        .dayNumber(e.getDayNumber())
                        .title(e.getTitle())
                        .amount(amount)
                        .currency(currency)
                        .payerType(payerType)
                        .payerUserId(payerUserId)
                        .payerLabel(payerLabel)
                        .createdById(e.getCreatedBy() != null ? e.getCreatedBy().getId() : null)
                        .createdAt(e.getCreatedAt())
                        .build());
            }

            tripTotalAmount += dayTotal;

            List<TripExpenseSummaryResponse.MemberTotal> memberTotals = memberAccumulators.values().stream()
                    .map(acc -> TripExpenseSummaryResponse.MemberTotal.builder()
                            .userId(acc.userId)
                            .label(acc.label)
                            .amount(acc.amount)
                            .totalsByCurrency(acc.totalsByCurrency)
                            .build())
                    .toList();

            daySummaries.add(TripExpenseSummaryResponse.DaySummary.builder()
                    .dayNumber(dayNumber)
                    .totalAmount(dayTotal)
                    .sharedAmount(sharedTotal)
                    .unspecifiedAmount(unspecifiedTotal)
                    .totalsByCurrency(dayTotalsByCurrency)
                    .sharedTotalsByCurrency(sharedTotalsByCurrency)
                    .memberTotals(memberTotals)
                    .items(items)
                    .build());
        }

        return TripExpenseSummaryResponse.builder()
                .tripId(trip.getId())
                .tripTotalAmount(tripTotalAmount)
                .tripTotalsByCurrency(tripTotalsByCurrency)
                .days(daySummaries)
                .build();
    }

    private String resolvePayerLabel(TripExpense expense, String normalizedPayerType) {
        if (PAYER_SHARED.equals(normalizedPayerType)) {
            return (expense.getPayerName() != null && !expense.getPayerName().isBlank())
                    ? expense.getPayerName()
                    : "공동 경비";
        }
        if (PAYER_MEMBER.equals(normalizedPayerType)) {
            if (expense.getPayerUser() != null
                    && expense.getPayerUser().getNickname() != null
                    && !expense.getPayerUser().getNickname().isBlank()) {
                return expense.getPayerUser().getNickname();
            }
            if (expense.getPayerName() != null && !expense.getPayerName().isBlank()) {
                return expense.getPayerName();
            }
            return "멤버";
        }
        return (expense.getPayerName() != null && !expense.getPayerName().isBlank())
                ? expense.getPayerName()
                : "미지정";
    }

    private static String normalizePayerType(String rawPayerType) {
        if (rawPayerType == null || rawPayerType.isBlank()) {
            return PAYER_UNSPECIFIED;
        }
        String upper = rawPayerType.trim().toUpperCase(Locale.ROOT);
        if (PAYER_SHARED.equals(upper)) {
            return PAYER_SHARED;
        }
        if (PAYER_MEMBER.equals(upper)) {
            return PAYER_MEMBER;
        }
        return PAYER_UNSPECIFIED;
    }

    private static String normalizeCurrency(String rawCurrency) {
        if (rawCurrency == null || rawCurrency.isBlank()) {
            return DEFAULT_CURRENCY;
        }
        String upper = rawCurrency.trim().toUpperCase(Locale.ROOT);
        return SUPPORTED_CURRENCIES.contains(upper) ? upper : DEFAULT_CURRENCY;
    }

    private static String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() > maxLength ? value.substring(0, maxLength) : value;
    }

    private Trip getTrip(Long tripId) {
        return tripRepository.findById(tripId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 여행 방입니다. ID: " + tripId));
    }

    private User requireAuthenticatedUser(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("로그인이 필요한 기능입니다.");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("로그인이 필요한 기능입니다."));
    }

    private static final class MemberAccumulator {
        private final Long userId;
        private final String label;
        private long amount;
        private final Map<String, Long> totalsByCurrency = new LinkedHashMap<>();

        private MemberAccumulator(Long userId, String label) {
            this.userId = userId;
            this.label = label;
        }
    }
}

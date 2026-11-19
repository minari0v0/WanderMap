package com.wandermap.wandermap.domain.expense;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@Builder
public class TripExpenseSummaryResponse {
    private Long tripId;
    private Long tripTotalAmount;
    private Map<String, Long> tripTotalsByCurrency;
    private List<DaySummary> days;

    @Getter
    @Builder
    public static class DaySummary {
        private int dayNumber;
        private long totalAmount;
        private long sharedAmount;
        private long unspecifiedAmount;
        private Map<String, Long> totalsByCurrency;
        private Map<String, Long> sharedTotalsByCurrency;
        private List<MemberTotal> memberTotals;
        private List<ExpenseItem> items;
    }

    @Getter
    @Builder
    public static class MemberTotal {
        private Long userId;
        private String label;
        private long amount;
        private Map<String, Long> totalsByCurrency;
    }

    @Getter
    @Builder
    public static class ExpenseItem {
        private Long id;
        private int dayNumber;
        private String title;
        private long amount;
        private String currency;
        private String payerType;
        private Long payerUserId;
        private String payerLabel;
        private Long createdById;
        private LocalDateTime createdAt;
    }
}

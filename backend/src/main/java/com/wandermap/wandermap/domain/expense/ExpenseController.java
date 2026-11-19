package com.wandermap.wandermap.domain.expense;

import com.wandermap.wandermap.global.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/trips/{tripId}/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;

    @GetMapping
    public ResponseEntity<TripExpenseSummaryResponse> getTripExpenses(@PathVariable Long tripId) {
        return ResponseEntity.ok(expenseService.getTripExpenses(tripId));
    }

    @PostMapping
    public ResponseEntity<TripExpenseSummaryResponse> addExpense(
            @PathVariable Long tripId,
            @RequestBody CreateExpenseRequest request
    ) {
        return ResponseEntity.ok(expenseService.addExpense(tripId, request, SecurityUtils.getCurrentUserId()));
    }

    @DeleteMapping("/{expenseId}")
    public ResponseEntity<TripExpenseSummaryResponse> deleteExpense(
            @PathVariable Long tripId,
            @PathVariable Long expenseId
    ) {
        return ResponseEntity.ok(expenseService.deleteExpense(tripId, expenseId, SecurityUtils.getCurrentUserId()));
    }
}

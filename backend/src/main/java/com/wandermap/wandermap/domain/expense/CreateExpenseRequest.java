package com.wandermap.wandermap.domain.expense;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class CreateExpenseRequest {
    private Integer dayNumber;
    private String title;
    private Long amount;
    private String currency;
    private String payerType;
    private Long payerUserId;
    private String payerName;
}

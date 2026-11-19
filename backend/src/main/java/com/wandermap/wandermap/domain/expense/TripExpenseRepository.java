package com.wandermap.wandermap.domain.expense;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TripExpenseRepository extends JpaRepository<TripExpense, Long> {

    List<TripExpense> findByTripIdOrderByDayNumberAscCreatedAtAsc(Long tripId);

    void deleteByTripId(Long tripId);

    @Modifying
    @Query("UPDATE TripExpense e SET e.payerUser = null WHERE e.payerUser.id = :userId")
    void clearPayerUserByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE TripExpense e SET e.createdBy = null WHERE e.createdBy.id = :userId")
    void clearCreatedByByUserId(@Param("userId") Long userId);
}

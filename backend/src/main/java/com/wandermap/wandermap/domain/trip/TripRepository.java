package com.wandermap.wandermap.domain.trip;

import com.wandermap.wandermap.domain.auth.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TripRepository extends JpaRepository<Trip, Long> {
    Optional<Trip> findByInviteCode(String inviteCode);
    List<Trip> findByCreatedBy(User user);
}

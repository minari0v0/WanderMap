package com.wandermap.wandermap.domain.trip;

import com.wandermap.wandermap.domain.auth.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TripMemberRepository extends JpaRepository<TripMember, Long> {
    boolean existsByTripAndUser(Trip trip, User user);
    List<TripMember> findByTrip(Trip trip);
}

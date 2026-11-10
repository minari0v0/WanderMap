package com.wandermap.wandermap.domain.trip;

import com.wandermap.wandermap.domain.auth.User;
import com.wandermap.wandermap.domain.auth.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TripService {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final UserRepository userRepository;

    @Transactional
    public TripResponse createTrip(TripCreateRequest request) {
        User user = requireAuthenticatedUser(request.getUserId());

        Trip trip = Trip.builder()
                .title(request.getTitle())
                .destination(request.getDestination())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .createdBy(user)
                .build();

        Trip savedTrip = tripRepository.save(trip);

        // 방장을 OWNER 멤버로 등록
        TripMember ownerMember = TripMember.builder()
                .trip(savedTrip)
                .user(user)
                .role(TripRole.OWNER)
                .build();
        tripMemberRepository.save(ownerMember);

        return TripResponse.from(savedTrip, List.of(ownerMember));
    }

    @Transactional
    public TripResponse joinTrip(String inviteCode, Long userId) {
        User user = requireAuthenticatedUser(userId);

        Trip trip = tripRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 초대 코드입니다: " + inviteCode));

        // 중복 참여 체크
        if (!tripMemberRepository.existsByTripAndUser(trip, user)) {
            TripMember newMember = TripMember.builder()
                    .trip(trip)
                    .user(user)
                    .role(TripRole.MEMBER)
                    .build();
            tripMemberRepository.save(newMember);
        }

        return TripResponse.from(trip, tripMemberRepository.findByTrip(trip));
    }

    public TripResponse getTrip(Long id) {
        Trip trip = tripRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 여행 방입니다. ID: " + id));
        return TripResponse.from(trip, tripMemberRepository.findByTrip(trip));
    }

    public TripResponse getTripByInviteCode(String inviteCode) {
        Trip trip = tripRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 초대 코드입니다: " + inviteCode));
        return TripResponse.from(trip, tripMemberRepository.findByTrip(trip));
    }

    public List<TripResponse> getMyTrips(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("로그인이 필요한 기능입니다.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("로그인이 필요한 기능입니다."));
        return tripMemberRepository.findByUserOrderByJoinedAtDesc(user)
                .stream()
                .map(tm -> TripResponse.from(tm.getTrip(), tripMemberRepository.findByTrip(tm.getTrip())))
                .toList();
    }

    private User requireAuthenticatedUser(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("로그인이 필요한 기능입니다.");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("로그인이 필요한 기능입니다."));
    }
}

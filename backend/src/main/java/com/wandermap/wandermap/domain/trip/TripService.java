package com.wandermap.wandermap.domain.trip;

import com.wandermap.wandermap.domain.auth.User;
import com.wandermap.wandermap.domain.auth.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TripService {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final UserRepository userRepository;

    @Transactional
    public TripResponse createTrip(TripCreateRequest request) {
        // 임시 로그인 유저 조회 (없을 경우 테스트용 Mock User 자동 생성)
        User user = getOrCreateMockUser(request.getUserId());

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

        return TripResponse.from(savedTrip);
    }

    @Transactional
    public TripResponse joinTrip(String inviteCode, Long userId) {
        Trip trip = tripRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 초대 코드입니다: " + inviteCode));

        User user = getOrCreateMockUser(userId);

        // 중복 참여 체크
        if (!tripMemberRepository.existsByTripAndUser(trip, user)) {
            TripMember newMember = TripMember.builder()
                    .trip(trip)
                    .user(user)
                    .role(TripRole.MEMBER)
                    .build();
            tripMemberRepository.save(newMember);
        }

        return TripResponse.from(trip);
    }

    public TripResponse getTrip(Long id) {
        Trip trip = tripRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 여행 방입니다. ID: " + id));
        return TripResponse.from(trip);
    }

    public TripResponse getTripByInviteCode(String inviteCode) {
        Trip trip = tripRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 초대 코드입니다: " + inviteCode));
        return TripResponse.from(trip);
    }

    private User getOrCreateMockUser(Long userId) {
        if (userId != null) {
            return userRepository.findById(userId)
                    .orElseGet(() -> createDefaultMockUser(userId));
        }
        return userRepository.findByEmail("test@wandermap.io")
                .orElseGet(() -> createDefaultMockUser(null));
    }

    private User createDefaultMockUser(Long preferredId) {
        User user = User.builder()
                .email("test@wandermap.io")
                .nickname("테스터")
                .profileImage("")
                .provider("LOCAL")
                .oauthId("mock-oauth-id")
                .build();
        return userRepository.save(user);
    }
}

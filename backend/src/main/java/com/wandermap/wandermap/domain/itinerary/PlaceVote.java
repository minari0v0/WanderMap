package com.wandermap.wandermap.domain.itinerary;

import com.wandermap.wandermap.domain.auth.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "place_votes", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"itinerary_place_id", "user_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlaceVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "itinerary_place_id", nullable = false)
    private ItineraryPlace itineraryPlace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "vote_type", nullable = false, length = 10)
    private String voteType; // UP | DOWN

    @CreationTimestamp
    @Column(name = "voted_at")
    private LocalDateTime votedAt;

    @Builder
    public PlaceVote(ItineraryPlace itineraryPlace, User user, String voteType) {
        this.itineraryPlace = itineraryPlace;
        this.user = user;
        this.voteType = voteType;
    }

    public void updateVoteType(String voteType) {
        this.voteType = voteType;
        this.votedAt = LocalDateTime.now();
    }
}


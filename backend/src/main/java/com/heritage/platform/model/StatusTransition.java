package com.heritage.platform.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "status_transitions")
public class StatusTransition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_id", nullable = false)
    private Resource resource;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id", nullable = false)
    private User actor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResourceStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResourceStatus toStatus;

    private Instant transitionedAt;

    @PrePersist
    protected void onCreate() {
        transitionedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Resource getResource() { return resource; }
    public void setResource(Resource resource) { this.resource = resource; }
    public User getActor() { return actor; }
    public void setActor(User actor) { this.actor = actor; }
    public ResourceStatus getFromStatus() { return fromStatus; }
    public void setFromStatus(ResourceStatus fromStatus) { this.fromStatus = fromStatus; }
    public ResourceStatus getToStatus() { return toStatus; }
    public void setToStatus(ResourceStatus toStatus) { this.toStatus = toStatus; }
    public Instant getTransitionedAt() { return transitionedAt; }
    public void setTransitionedAt(Instant transitionedAt) { this.transitionedAt = transitionedAt; }
}

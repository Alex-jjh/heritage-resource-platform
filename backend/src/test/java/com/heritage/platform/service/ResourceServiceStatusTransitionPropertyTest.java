package com.heritage.platform.service;

import com.heritage.platform.exception.InvalidStatusTransitionException;
import com.heritage.platform.model.*;
import com.heritage.platform.repository.*;
import net.jqwik.api.*;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ResourceServiceStatusTransitionPropertyTest {

    private static final Map<ResourceStatus, Set<ResourceStatus>> ALLOWED_TRANSITIONS = Map.of(
        ResourceStatus.DRAFT, Set.of(ResourceStatus.PENDING_REVIEW),
        ResourceStatus.PENDING_REVIEW, Set.of(ResourceStatus.APPROVED, ResourceStatus.REJECTED),
        ResourceStatus.APPROVED, Set.of(ResourceStatus.ARCHIVED, ResourceStatus.DRAFT),
        ResourceStatus.REJECTED, Set.of(ResourceStatus.DRAFT),
        ResourceStatus.ARCHIVED, Set.of()
    );

    @Mock private ResourceRepository resourceRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private TagRepository tagRepository;
    @Mock private UserRepository userRepository;
    @Mock private StatusTransitionRepository statusTransitionRepository;

    private ResourceService resourceService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        resourceService = new ResourceService(
                resourceRepository, categoryRepository, tagRepository,
                userRepository, statusTransitionRepository);
    }

    private Resource createResourceWithStatus(ResourceStatus status) {
        Resource resource = new Resource();
        resource.setId(UUID.randomUUID());
        resource.setStatus(status);
        resource.setTitle("Test Resource");
        resource.setCopyrightDeclaration("CC BY 4.0");
        Category cat = new Category();
        cat.setId(UUID.randomUUID());
        cat.setName("Test");
        resource.setCategory(cat);
        User contributor = new User();
        contributor.setId(UUID.randomUUID());
        contributor.setDisplayName("Test User");
        resource.setContributor(contributor);
        return resource;
    }

    private User createActor() {
        User actor = new User();
        actor.setId(UUID.randomUUID());
        actor.setCognitoSub("actor-sub");
        actor.setDisplayName("Actor");
        actor.setRole(UserRole.ADMINISTRATOR);
        return actor;
    }

    @Property
    void validTransitionsSucceed(
            @ForAll("validTransitionPairs") Tuple.Tuple2<ResourceStatus, ResourceStatus> pair) {
        setUp();

        ResourceStatus from = pair.get1();
        ResourceStatus to = pair.get2();

        Resource resource = createResourceWithStatus(from);
        User actor = createActor();

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));
        when(resourceRepository.save(any(Resource.class))).thenAnswer(inv -> inv.getArgument(0));
        when(statusTransitionRepository.save(any(StatusTransition.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        Resource result = resourceService.transitionStatus(resource.getId(), to, actor);

        assertThat(result.getStatus()).isEqualTo(to);
        verify(statusTransitionRepository).save(any(StatusTransition.class));
    }

    @Property
    void invalidTransitionsAreRejected(
            @ForAll("invalidTransitionPairs") Tuple.Tuple2<ResourceStatus, ResourceStatus> pair) {
        setUp();

        ResourceStatus from = pair.get1();
        ResourceStatus to = pair.get2();

        Resource resource = createResourceWithStatus(from);
        User actor = createActor();

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));

        assertThatThrownBy(() -> resourceService.transitionStatus(resource.getId(), to, actor))
                .isInstanceOf(InvalidStatusTransitionException.class);

        assertThat(resource.getStatus()).isEqualTo(from);
        verify(statusTransitionRepository, never()).save(any());
    }

    @Provide
    Arbitrary<Tuple.Tuple2<ResourceStatus, ResourceStatus>> validTransitionPairs() {
        return Arbitraries.of(
            ALLOWED_TRANSITIONS.entrySet().stream()
                .flatMap(entry -> entry.getValue().stream()
                    .map(to -> Tuple.of(entry.getKey(), to)))
                .toList()
        );
    }

    @Provide
    Arbitrary<Tuple.Tuple2<ResourceStatus, ResourceStatus>> invalidTransitionPairs() {
        Set<ResourceStatus> allStatuses = Set.of(ResourceStatus.values());
        return Arbitraries.of(
            allStatuses.stream()
                .flatMap(from -> allStatuses.stream()
                    .filter(to -> !ALLOWED_TRANSITIONS.getOrDefault(from, Set.of()).contains(to))
                    .map(to -> Tuple.of(from, to)))
                .toList()
        );
    }
}

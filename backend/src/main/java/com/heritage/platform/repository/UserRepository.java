package com.heritage.platform.repository;

import com.heritage.platform.model.User;
import com.heritage.platform.model.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByCognitoSub(String cognitoSub);
    Optional<User> findByEmail(String email);
    List<User> findByRoleAndContributorRequestedTrue(UserRole role);
}

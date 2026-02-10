package com.petbooking.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

@Service
public class RedisService {

    private static final Logger logger = LoggerFactory.getLogger(RedisService.class);

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    /**
     * Tries to get value from Redis.
     * If HIT: returns value.
     * If MISS: calls dbFetcher, saves result to Redis (with TTL), and returns it.
     */
    public <T> T getOrFetch(String key, Class<T> type, Supplier<T> dbFetcher, long ttlSeconds) {
        try {
            // 1. Check Cache
            Object cachedValue = redisTemplate.opsForValue().get(key);

            if (cachedValue != null && type.isInstance(cachedValue)) {
                logger.info("🔥 CACHE HIT for key: {}", key);
                System.out.println("🔥 CACHE HIT for key: " + key);
                return type.cast(cachedValue);
            } else {
                logger.info("❌ CACHE MISS for key: {}", key);
                System.out.println("❌ CACHE MISS for key: " + key);
            }

            // 2. Fetch from DB
            T dbValue = dbFetcher.get();

            // 3. Save to Cache
            if (dbValue != null) {
                redisTemplate.opsForValue().set(key, dbValue, ttlSeconds, TimeUnit.SECONDS);
                logger.info("✅ Cached value for key: {}", key);
            }

            return dbValue;

        } catch (Exception e) {
            logger.error("⚠️ Redis error: {}", e.getMessage());
            // Fallback to DB if Redis fails
            return dbFetcher.get();
        }
    }

    public void clearCache(String key) {
        redisTemplate.delete(key);
        System.out.println("🗑️ Cache CLEARED for key: " + key);
    }
}

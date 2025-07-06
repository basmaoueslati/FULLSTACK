package com.example.demo;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Configuration;

@SpringBootTest(classes = DemoApplicationTests.EmptyConfig.class)
class DemoApplicationTests {

    @Test
    void contextLoads() {
    }

    @Configuration
    static class EmptyConfig {
        // no beans
    }
}

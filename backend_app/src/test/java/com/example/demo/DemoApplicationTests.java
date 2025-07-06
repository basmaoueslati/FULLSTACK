package com.example.demo;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@SpringBootTest(classes = {}, webEnvironment = SpringBootTest.WebEnvironment.NONE)
class DemoApplicationTests {

    @Test
    void contextLoads() {
    }
}

@Configuration
@EnableAutoConfiguration
@ComponentScan(excludeFilters = @ComponentScan.Filter(type = org.springframework.context.annotation.FilterType.REGEX, pattern = "com\\.example\\.demo\\..*"))
class NoDbTestConfig {
    // no beans will be loaded from your app
}

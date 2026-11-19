package com.wandermap.wandermap;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
public class WandermapApplication {

	public static void main(String[] args) {
		SpringApplication.run(WandermapApplication.class, args);
	}

}

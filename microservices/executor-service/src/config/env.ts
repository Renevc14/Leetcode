import 'dotenv/config';

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: parseInt(optional('PORT', '3005'), 10),
  images: {
    PYTHON: optional('EXEC_IMAGE_PYTHON', 'leetcode-exec-python:latest'),
    JAVASCRIPT: optional('EXEC_IMAGE_NODE', 'leetcode-exec-node:latest'),
    TYPESCRIPT: optional('EXEC_IMAGE_NODE', 'leetcode-exec-node:latest'),
    JAVA: optional('EXEC_IMAGE_JAVA', 'leetcode-exec-java:latest'),
    CPP: optional('EXEC_IMAGE_CPP', 'leetcode-exec-cpp:latest'),
  } as Record<string, string>,
  maxConcurrentContainers: parseInt(optional('MAX_CONCURRENT_CONTAINERS', '4'), 10),
  containerCpu: optional('CONTAINER_CPU', '1.0'),
} as const;

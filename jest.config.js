module.exports = {
  projects: [
    {
      displayName: 'cedar-os',
      testMatch: ['<rootDir>/packages/cedar-os/**/*.test.{ts,tsx}'],
      testEnvironment: 'jsdom',
      transform: {
        '^.+\\.(ts|tsx)$': ['babel-jest', {
          presets: [
            ['@babel/preset-env', { targets: { node: 'current' } }],
            '@babel/preset-typescript',
            '@babel/preset-react'
          ]
        }]
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/packages/cedar-os/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      collectCoverageFrom: [
        'packages/cedar-os/src/**/*.{ts,tsx}',
        '!packages/cedar-os/src/**/*.d.ts',
        '!packages/cedar-os/src/**/*.test.{ts,tsx}'
      ]
    },
    {
      displayName: 'cedar-os-backend',
      testMatch: ['<rootDir>/packages/cedar-os-backend/**/*.test.ts'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/packages/cedar-os-backend/src/$1',
      },
      collectCoverageFrom: [
        'packages/cedar-os-backend/src/**/*.ts',
        '!packages/cedar-os-backend/src/**/*.d.ts',
        '!packages/cedar-os-backend/src/**/*.test.ts'
      ]
    }
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/']
}; 
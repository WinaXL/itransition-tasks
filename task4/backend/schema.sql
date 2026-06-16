-- User Management Admin Panel - Database Schema
-- Run this file against your PostgreSQL database to initialize the schema.

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  password    VARCHAR(255) NOT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'Unverified'
                CHECK (status IN ('Unverified', 'Active', 'Blocked')),
  last_login  TIMESTAMPTZ  DEFAULT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Enforces uniqueness at the database level (no code-level SELECT checks).
-- PostgreSQL error code 23505 is thrown on violation.
CREATE UNIQUE INDEX IF NOT EXISTS uidx_user_email ON users (email);

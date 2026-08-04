#!/bin/bash
# Shell script wrapper to execute the rate limiter stresstest
python "$(dirname "$0")/rate_limit_test.py"

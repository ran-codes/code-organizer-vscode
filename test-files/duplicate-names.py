# Fixture for #47: a section sharing its parent's name.
#
# Before the fix the built-in Outline showed only the first "Setup" and the
# entire subtree below the duplicate vanished, while the Activity Bar view
# still showed it. Both views must now agree:
#
#   Setup
#     Setup
#       Details
#         Deep
#
# Check all four surfaces: Outline panel, breadcrumbs, Ctrl+Shift+O, and the
# Code Organizer Activity Bar view.

# Setup ----
import os

## Setup ----
CONFIG_PATH = os.getenv("CONFIG_PATH", "config.toml")

### Details ----
RETRIES = 3
TIMEOUT = 30

#### Deep ----
DEBUG = False

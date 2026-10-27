#!/bin/bash
#
# sukantratnakar.com — go live with branch prechange-update
#
# Run as sukantratnakar (an admin who can sudo), from any folder:
#
#   /bin/bash /Users/sukantratnakar/Code/website-preview/scripts/go-live.sh
#
# In order:
#   a. stop unless "/Volumes/QZ HD 2025" is mounted
#   b. archive the live folder (without node_modules) to the backup drive
#   c. check the archive opens; stop if not
#   d. keep the newest 30 archives
#   e. warn if /Users/sukantclawdbot/backups/projects has nothing from the last 26 hours
#   f. as sukantclawdbot: git fetch, merge origin/prechange-update
#   g. chown the live folder to sukantclawdbot:staff
#   h. build as sukantclawdbot with /opt/homebrew/bin/node
#   i. pm2 restart website, as sukantclawdbot
#   j. push
# Stops at the first error. Nothing after a failed step runs.

set -euo pipefail

LIVE="/Users/sukantclawdbot/clawd/website"
LIVE_PARENT="/Users/sukantclawdbot/clawd"
LIVE_USER="sukantclawdbot"
NODE="/opt/homebrew/bin/node"
BRANCH="prechange-update"
VOLUME="/Volumes/QZ HD 2025"
BACKUP_DIR="/Volumes/QZ HD 2025/Claude Backups/sukantratnakar.com Backup"
PROJECT_BACKUPS="/Users/sukantclawdbot/backups/projects"
KEEP=30

STAMP="$(/bin/date +%Y%m%d-%H%M%S)"
ARCHIVE="${BACKUP_DIR}/website-${STAMP}.tar.gz"

step() { /bin/echo; /bin/echo "==> $*"; }
fail() { /bin/echo "STOPPED: $*" >&2; exit 1; }
trap 'fail "a command failed on line ${LINENO}. Nothing after it ran."' ERR

as_live() { /usr/bin/sudo -u "${LIVE_USER}" -i "$@"; }

step "Checking sudo, node and the live folder"
/usr/bin/sudo -v
/bin/test -x "${NODE}" || fail "${NODE} not found"
/usr/bin/sudo /bin/test -d "${LIVE}/.git" || fail "${LIVE} is not a git checkout"

# a. backup drive
step "a. Checking ${VOLUME} is mounted"
/sbin/mount | /usr/bin/grep -F -q " on ${VOLUME} (" || fail "${VOLUME} is not mounted. Plug in the drive and run again."

# b. archive
step "b. Archiving ${LIVE} (without node_modules)"
/bin/mkdir -p "${BACKUP_DIR}"
/usr/bin/sudo /usr/bin/tar -czf "${ARCHIVE}" --exclude node_modules -C "${LIVE_PARENT}" website
/usr/bin/sudo /usr/sbin/chown "$(/usr/bin/id -un)" "${ARCHIVE}"
/bin/echo "    ${ARCHIVE}"

# c. verify
step "c. Checking the archive opens"
/usr/bin/tar -tzf "${ARCHIVE}" > /dev/null || fail "the archive does not open: ${ARCHIVE}"
/usr/bin/tar -tzf "${ARCHIVE}" | /usr/bin/grep -F -q -x "website/build.js" || fail "the archive has no website/build.js: ${ARCHIVE}"
/bin/echo "    ok, $(/usr/bin/tar -tzf "${ARCHIVE}" | /usr/bin/wc -l | /usr/bin/tr -d ' ') entries"

# d. keep the newest 30 (names sort by date: website-YYYYMMDD-HHMMSS.tar.gz)
step "d. Keeping the newest ${KEEP} archives"
/bin/ls -1 "${BACKUP_DIR}" \
  | /usr/bin/grep -E '^website-[0-9]{8}-[0-9]{6}\.tar\.gz$' \
  | /usr/bin/sort -r \
  | /usr/bin/tail -n +$((KEEP + 1)) \
  | while IFS= read -r old; do
      /bin/echo "    removing ${old}"
      /usr/bin/sudo /bin/rm -f "${BACKUP_DIR}/${old}"
    done

# e. recent project backup (warning only)
step "e. Looking for a project backup from the last 26 hours"
if /usr/bin/sudo /bin/test -d "${PROJECT_BACKUPS}" \
   && [ -n "$(/usr/bin/sudo /usr/bin/find "${PROJECT_BACKUPS}" -type f -mmin -1560 -print -quit)" ]; then
  /bin/echo "    ok"
else
  /bin/echo "    WARNING: no backup newer than 26 hours in ${PROJECT_BACKUPS}. Carrying on; the archive above is today's backup."
fi

# f. merge, as the live user. Stop if tracked files have local edits or a merge is half-done.
step "f. Fetching and merging origin/${BRANCH} as ${LIVE_USER}"
[ -z "$(as_live /usr/bin/git -C "${LIVE}" status --porcelain --untracked-files=no)" ] \
  || fail "the live folder has uncommitted edits to tracked files. Look at: sudo -u ${LIVE_USER} -i /usr/bin/git -C ${LIVE} status"
as_live /usr/bin/git -C "${LIVE}" fetch origin
/bin/echo "    on branch: $(as_live /usr/bin/git -C "${LIVE}" rev-parse --abbrev-ref HEAD)"
as_live /usr/bin/git -C "${LIVE}" merge --no-edit "origin/${BRANCH}"

# g. ownership
step "g. chown -R ${LIVE_USER}:staff ${LIVE}"
/usr/bin/sudo /usr/sbin/chown -R "${LIVE_USER}:staff" "${LIVE}"

# h. build, as the live user
step "h. Building as ${LIVE_USER}"
/bin/test -x "${NODE}" || fail "${NODE} not found"
as_live /bin/sh -c "cd '${LIVE}' && '${NODE}' build.js"

# i. restart
step "i. pm2 restart website"
/usr/bin/sudo -u "${LIVE_USER}" -i pm2 restart website

# j. push
step "j. Pushing"
as_live /usr/bin/git -C "${LIVE}" push origin HEAD

step "Done. Quick check of the live server:"
/bin/sleep 2
for path in / /speaking /speaking.json; do
  /bin/echo "    $(/usr/bin/curl -s -o /dev/null -w '%{http_code}' "http://localhost:8082${path}")  ${path}"
done
/bin/echo "    Backup: ${ARCHIVE}"

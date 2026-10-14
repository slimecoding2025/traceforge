export const SYNTHETIC_AUTH_LOG = `# ==============================================================================
# TRACEFORGE SYNTHETIC DEMONSTRATION DATASET
# NOTICE: Purely synthetic security logs for defensive investigation testing.
# No real IP addresses, users, or systems are represented.
# ==============================================================================
Oct 12 08:00:15 sec-srv-01 sshd[4102]: Accepted publickey for alice from 192.0.2.10 port 51234 ssh2: RSA SHA256:abc123demo
Oct 12 08:00:15 sec-srv-01 sshd[4102]: pam_unix(sshd:session): session opened for user alice(uid=1001) by (uid=0)
Oct 12 08:05:22 sec-srv-01 sshd[4102]: pam_unix(sshd:session): session closed for user alice
Oct 12 08:12:01 sec-srv-01 sshd[4201]: Failed password for bob from 192.0.2.14 port 48110 ssh2
Oct 12 08:12:18 sec-srv-01 sshd[4205]: Accepted password for bob from 192.0.2.14 port 48112 ssh2
Oct 12 08:12:18 sec-srv-01 sshd[4205]: pam_unix(sshd:session): session opened for user bob(uid=1002) by (uid=0)
Oct 12 08:15:00 sec-srv-01 sshd[4205]: pam_unix(sshd:session): session closed for user bob
Oct 12 09:10:02 sec-srv-01 sshd[4310]: Failed password for root from 198.51.100.23 port 39101 ssh2
Oct 12 09:10:07 sec-srv-01 sshd[4312]: Failed password for root from 198.51.100.23 port 39102 ssh2
Oct 12 09:10:13 sec-srv-01 sshd[4315]: Failed password for root from 198.51.100.23 port 39103 ssh2
Oct 12 09:10:19 sec-srv-01 sshd[4318]: Failed password for root from 198.51.100.23 port 39104 ssh2
Oct 12 09:10:25 sec-srv-01 sshd[4321]: Failed password for root from 198.51.100.23 port 39105 ssh2
Oct 12 09:10:31 sec-srv-01 sshd[4324]: Failed password for root from 198.51.100.23 port 39106 ssh2
Oct 12 09:25:00 sec-srv-01 CRON[4401]: pam_unix(cron:session): session opened for user root(uid=0) by (uid=0)
Oct 12 09:25:01 sec-srv-01 CRON[4401]: pam_unix(cron:session): session closed for user root
Oct 12 09:40:10 sec-srv-01 sshd[4510]: Failed password for invalid user admin from 198.51.100.88 port 42001 ssh2
Oct 12 09:40:25 sec-srv-01 sshd[4512]: Failed password for invalid user guest from 198.51.100.88 port 42002 ssh2
Oct 12 09:40:40 sec-srv-01 sshd[4514]: Failed password for invalid user test from 198.51.100.88 port 42003 ssh2
Oct 12 09:40:55 sec-srv-01 sshd[4516]: Failed password for oracle from 198.51.100.88 port 42004 ssh2
Oct 12 10:14:02 sec-srv-01 sshd[4601]: Failed password for deploy from 198.51.100.99 port 53101 ssh2
Oct 12 10:14:15 sec-srv-01 sshd[4603]: Failed password for deploy from 198.51.100.99 port 53102 ssh2
Oct 12 10:14:28 sec-srv-01 sshd[4605]: Failed password for deploy from 198.51.100.99 port 53103 ssh2
Oct 12 10:14:41 sec-srv-01 sshd[4608]: Failed password for deploy from 198.51.100.99 port 53104 ssh2
Oct 12 10:15:02 sec-srv-01 sshd[4610]: Accepted password for deploy from 198.51.100.99 port 53110 ssh2
Oct 12 10:15:02 sec-srv-01 sshd[4610]: pam_unix(sshd:session): session opened for user deploy(uid=1003) by (uid=0)
Oct 12 10:16:11 sec-srv-01 sudo:   deploy : TTY=pts/1 ; PWD=/home/deploy ; USER=root ; COMMAND=/bin/bash
Oct 12 10:30:10 sec-srv-01 sshd[4701]: Invalid user backup from 198.51.100.105 port 60101
Oct 12 10:30:15 sec-srv-01 sshd[4703]: Invalid user temp from 198.51.100.105 port 60102
Oct 12 10:30:20 sec-srv-01 sshd[4705]: Invalid user staging from 198.51.100.105 port 60103
--- CORRUPT DISK BLOCK [GARBAGE BYTES \\x00\\xFF] ---
Oct 12 invalid-date-format incomplete line`;

export const SYNTHETIC_JSONL_LOG = `{"timestamp": "2026-10-12T11:00:01Z", "source_ip": "198.51.100.201", "username": "root", "event_type": "ssh_login_failed", "outcome": "failure", "message": "Failed password for root", "hostname": "cloud-node-01"}
{"timestamp": "2026-10-12T11:00:06Z", "source_ip": "198.51.100.201", "username": "root", "event_type": "ssh_login_failed", "outcome": "failure", "message": "Failed password for root", "hostname": "cloud-node-01"}
{"timestamp": "2026-10-12T11:00:11Z", "source_ip": "198.51.100.201", "username": "root", "event_type": "ssh_login_failed", "outcome": "failure", "message": "Failed password for root", "hostname": "cloud-node-01"}
{"timestamp": "2026-10-12T11:00:16Z", "source_ip": "198.51.100.201", "username": "root", "event_type": "ssh_login_failed", "outcome": "failure", "message": "Failed password for root", "hostname": "cloud-node-01"}
{"timestamp": "2026-10-12T11:00:21Z", "source_ip": "198.51.100.201", "username": "root", "event_type": "ssh_login_failed", "outcome": "failure", "message": "Failed password for root", "hostname": "cloud-node-01"}
{"timestamp": "2026-10-12T11:00:26Z", "source_ip": "198.51.100.201", "username": "root", "event_type": "ssh_login_failed", "outcome": "failure", "message": "Failed password for root", "hostname": "cloud-node-01"}
{"timestamp": "2026-10-12T11:15:00Z", "source_ip": "192.0.2.55", "username": "developer", "event_type": "ssh_login_success", "outcome": "success", "message": "Accepted publickey for developer", "hostname": "cloud-node-01"}
{"timestamp": "2026-10-12T11:16:10Z", "source_ip": null, "username": "developer", "event_type": "sudo_elevation", "outcome": "success", "message": "sudo: developer : COMMAND=/bin/bash", "hostname": "cloud-node-01", "command": "/bin/bash", "target_user": "root"}
{"corrupt_json": [unclosed_bracket_invalid_record
{"timestamp": "2026-10-12T11:20:00Z", "source_ip": "192.0.2.60", "username": "operator", "event_type": "session_opened", "outcome": "success", "message": "session opened for user operator", "hostname": "cloud-node-01"}`;

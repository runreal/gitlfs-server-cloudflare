# Cloudflare Workers GitLFS Server

## Description

This is a Cloudflare Workers server that acts as a GitLFS server.

All the files are stored in R2 storage.
Locking is done with Durable Objects.

## Why GitLFS on Cloudflare?

When you have a large repository, it's best not to store all the files within the repository itself. Git LFS allows you to store large files externally.

If you use GitHub LFS, you must pay for storage and bandwidth. Storage costs $0,07 per GB per month, while bandwidth costs $0,0875 per GB.

On Cloudflare, you can store files in R2 storage for $0,015 per GB per month, and bandwidth is free.

## TODO

[] Auth using GitHub Token

# Secure Gubiq Release Pipeline

## Objective

Every official Gubiq binary should be traceable to a reviewed source commit and
independently verifiable without trusting a download page or a maintainer's
workstation.

## Required release properties

1. A release is triggered only by a protected, signed `v*` tag.
2. The workflow checks out the immutable tag commit.
3. Build dependencies and GitHub Actions are pinned to immutable revisions.
4. The build runs tests before producing artifacts.
5. Every artifact receives a SHA-256 checksum.
6. The release includes a CycloneDX or SPDX SBOM.
7. GitHub artifact attestations bind each binary to repository, workflow, and
   commit.
8. Checksums are signed with a documented project release identity.
9. The workflow publishes directly to a matching GitHub Release.
10. Release verification instructions are tested on Linux, macOS, and Windows.

## Proposed workflow stages

```text
signed protected tag
        |
        v
source + dependency verification
        |
        v
tests ----> fail closed
        |
        v
isolated multi-platform builds
        |
        v
checksums + SBOM + attestations
        |
        v
signed manifest
        |
        v
GitHub Release publication
```

## Reproducibility

Bit-for-bit reproducibility is the target, but it should not be claimed until
two independent builders produce identical hashes from the same tag. Until
then, provenance attestations and independently repeated builds should be
published with explicit limitations.

## Repository protections

- require pull requests and two reviews for protocol and release code;
- require passing tests, lint, dependency review, and CodeQL;
- prevent force pushes and branch deletion;
- restrict tag creation to the release role;
- use short-lived GitHub OIDC permissions instead of stored cloud credentials;
- set workflow permissions to read-only by default;
- require an approval environment for public release publication.

## Migration plan

1. Reproduce v7.0.2 from its tag and compare locally built binaries.
2. Add checksums and an SBOM for the reproduction as a clearly labeled audit
   artifact, not as a retroactive official signature.
3. Implement the protected release workflow on a rehearsal tag.
4. Have two independent contributors verify the rehearsal.
5. Use the new process for the next patch release.


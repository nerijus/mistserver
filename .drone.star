PLATFORMS = [
    {"os": "linux", "arch": "amd64"},
    {"os": "linux", "arch": "arm64"},
    {"os": "darwin", "arch": "amd64"},
]

TRIGGER_CONDITION = {
    "event": [
        "push",
        # "pull_request",
        "tag",
    ]
}


def get_docker_tags(repo, prefix, branch, commit):
    tags = [
        "latest",
        "catalyst",
        branch.replace("/", "-"),
        "$DRONE_BUILD_CREATED",
        commit,
        commit[:8],
    ]
    return ["%s:%s-%s" % (repo, prefix, tag) for tag in tags]


def docker_image_pipeline(arch, target, build_context):
    image_tags = get_docker_tags(
        "livepeerci/mistserver",
        target,
        build_context.branch,
        build_context.commit,
    )
    return {
        "kind": "pipeline",
        "name": "docker-%s-%s"
        % (
            arch,
            target,
        ),
        "type": "exec",
        "platform": {
            "os": "linux",
            "arch": arch,
        },
        "steps": [
            {
                "name": "build",
                "commands": [
                    "docker buildx build --target=mist-{}-release --tag {} .".format(
                        target,
                        " --tag ".join(image_tags),
                    ),
                ],
                "when": TRIGGER_CONDITION,
            },
            {
                "name": "login",
                "commands": [
                    "docker login -u $DOCKERHUB_USERNAME -p $DOCKERHUB_PASSWORD",
                ],
                "environment": {
                    "DOCKERHUB_USERNAME": {"from_secret": "DOCKERHUB_USERNAME"},
                    "DOCKERHUB_PASSWORD": {"from_secret": "DOCKERHUB_PASSWORD"},
                },
                "when": TRIGGER_CONDITION,
            },
            {
                "name": "push",
                "commands": ["docker push %s" % (tag,) for tag in image_tags],
                "when": TRIGGER_CONDITION,
            },
        ],
    }


def binaries_pipeline(platform):
    return {
        "kind": "pipeline",
        "name": "build-%s-%s" % (platform["os"], platform["arch"]),
        "type": "exec",
        "platform": {
            "os": platform["os"],
            "arch": platform["arch"],
        },
        "workspace": {"path": "drone/mistserver"},
        "steps": [
            {
                "name": "dependencies",
                "commands": [
                    'export CI_PATH="$(realpath ..)"',
                    "git clone https://github.com/cisco/libsrtp.git $CI_PATH/libsrtp",
                    "git clone -b dtls_srtp_support --depth=1 https://github.com/livepeer/mbedtls.git $CI_PATH/mbedtls",
                    "git clone https://github.com/Haivision/srt.git $CI_PATH/srt",
                    "mkdir -p $CI_PATH/libsrtp/build $CI_PATH/mbedtls/build $CI_PATH/srt/build $CI_PATH/compiled",
                    "cd $CI_PATH/libsrtp/build/ && cmake -DCMAKE_INSTALL_PATH=$CI_PATH/compiled .. && make -j $(nproc) install",
                    "cd $CI_PATH/mbedtls/build/ && cmake -DCMAKE_INSTALL_PATH=$CI_PATH/compiled .. && make -j $(nproc) install",
                    "cd $CI_PATH/srt/build/ && cmake -DCMAKE_INSTALL_PATH=$CI_PATH/compiled -D USE_ENCLIB=mbedtls -D ENABLE_SHARED=false .. && make -j $(nproc) install",
                ],
                "when": TRIGGER_CONDITION,
            },
            {
                "name": "binaries",
                "commands": [
                    'export LD_LIBRARY_PATH="$(realpath ..)/compiled/lib" && export C_INCLUDE_PATH="$(realpath ..)/compiled/include" && export CI_PATH=$(realpath ..)',
                    "mkdir -p build/",
                    "cd build && cmake -DPERPETUAL=1 -DLOAD_BALANCE=1 -DCMAKE_INSTALL_PREFIX=$CI_PATH/bin -DCMAKE_PREFIX_PATH=$CI_PATH/compiled -DCMAKE_BUILD_TYPE=RelWithDebInfo ..",
                    "make -j $(nproc) && make install",
                ],
                "when": TRIGGER_CONDITION,
            },
        ],
    }


def get_context(context):
    """Template pipeline to get information about build context."""
    return {
        "kind": "pipeline",
        "type": "exec",
        "name": "context",
        "steps": [{"name": "print", "commands": ["echo '%s'" % (context,)]}],
    }


def main(context):
    if context.build.event == "tag":
        return [{}]
    manifest = []
    for arch in ("amd64", "arm64"):
        manifest.append(docker_image_pipeline(arch, "debug", context.build))
        manifest.append(docker_image_pipeline(arch, "strip", context.build))
    for platform in PLATFORMS:
        manifest.append(binaries_pipeline(platform))
    return manifest

// CI/CD for inci: lint, build the image, scan it, and — on main — push it to
// the registry and roll the server to it (deploy/deploy.sh).
//
// Set up as a Multibranch Pipeline: the push/deploy stages run only for
// the main branch.
//
// Agent requirements: a Docker daemon (with buildx) and an ssh client.
//
// Job configuration (Manage Jenkins → System → Global properties, or the
// folder/job properties):
//   INCI_REGISTRY    registry host, e.g. registry.example.com
//   INCI_IMAGE       full image name, e.g. registry.example.com/inci
//   DEPLOY_HOST      server that runs deploy/docker-compose.yml
//   DEPLOY_USER      ssh user on that server (member of the docker group)
//   DEPLOY_PATH      deploy directory on the server, e.g. /opt/inci
//   TRIVY_IMAGE      (optional) scanner image, defaults to aquasec/trivy:latest
//
// Credentials:
//   inci-registry          Username with password — push access to INCI_IMAGE
//   inci-deploy-ssh        SSH Username with private key — DEPLOY_USER's key
//   inci-deploy-known-hosts Secret file — the server's known_hosts line
//                          (ssh-keyscan -H <host>, verified out of band)
//
// Secrets the app needs at runtime (SESSION_SECRET etc.) live only in the
// server's .env; they never pass through Jenkins.

pipeline {
  agent any

  options {
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 30, unit: 'MINUTES')
  }

  environment {
    DOCKER_BUILDKIT = '1'
    IMAGE_TAG = "${env.GIT_COMMIT.take(12)}-${env.BUILD_NUMBER}"
    // Pin this to a version (ideally by digest) you have vetted.
    TRIVY_IMAGE = "${env.TRIVY_IMAGE ?: 'aquasec/trivy:latest'}"
  }

  stages {
    stage('Lint') {
      steps {
        sh 'docker build --target lint --progress=plain .'
      }
    }

    stage('Build image') {
      steps {
        sh '''
          docker build --pull \
            --label org.opencontainers.image.revision="$GIT_COMMIT" \
            --label org.opencontainers.image.source="$GIT_URL" \
            -t "$INCI_IMAGE:$IMAGE_TAG" .
        '''
      }
    }

    stage('Scan image') {
      steps {
        // Fails the build on CRITICAL vulnerabilities that have a fix;
        // HIGH ones are reported without failing.
        sh '''
          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock:ro \
            -v trivy-cache:/root/.cache/trivy \
            "$TRIVY_IMAGE" image --quiet --ignore-unfixed \
              --severity HIGH,CRITICAL --exit-code 0 "$INCI_IMAGE:$IMAGE_TAG"
          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock:ro \
            -v trivy-cache:/root/.cache/trivy \
            "$TRIVY_IMAGE" image --quiet --ignore-unfixed \
              --severity CRITICAL --exit-code 1 "$INCI_IMAGE:$IMAGE_TAG"
        '''
      }
    }

    stage('Push image') {
      when { branch 'main' }
      steps {
        withCredentials([usernamePassword(credentialsId: 'inci-registry',
                                          usernameVariable: 'REGISTRY_USER',
                                          passwordVariable: 'REGISTRY_PASSWORD')]) {
          sh '''
            export DOCKER_CONFIG="$WORKSPACE/.docker"
            echo "$REGISTRY_PASSWORD" | docker login "$INCI_REGISTRY" -u "$REGISTRY_USER" --password-stdin
            docker push "$INCI_IMAGE:$IMAGE_TAG"
            docker tag "$INCI_IMAGE:$IMAGE_TAG" "$INCI_IMAGE:latest"
            docker push "$INCI_IMAGE:latest"
          '''
        }
      }
    }

    stage('Deploy') {
      when { branch 'main' }
      steps {
        withCredentials([
          sshUserPrivateKey(credentialsId: 'inci-deploy-ssh', keyFileVariable: 'SSH_KEY'),
          file(credentialsId: 'inci-deploy-known-hosts', variable: 'KNOWN_HOSTS'),
        ]) {
          sh '''
            SSH_OPTS="-i $SSH_KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$KNOWN_HOSTS"
            TARGET="$DEPLOY_USER@$DEPLOY_HOST"

            scp $SSH_OPTS deploy/docker-compose.yml deploy/Caddyfile deploy/deploy.sh deploy/.env.example \
              "$TARGET:$DEPLOY_PATH/"
            ssh $SSH_OPTS "$TARGET" "cd '$DEPLOY_PATH' && chmod +x deploy.sh && ./deploy.sh '$IMAGE_TAG'"
          '''
        }
      }
    }
  }

  post {
    always {
      // Drop registry credentials and this build's local tags so the agent
      // does not accumulate either.
      sh '''
        rm -rf "$WORKSPACE/.docker"
        docker image rm "$INCI_IMAGE:$IMAGE_TAG" "$INCI_IMAGE:latest" >/dev/null 2>&1 || true
      '''
    }
  }
}

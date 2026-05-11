pipeline {

  agent { label 'node-agent' }

  environment {
    AWS_REGION = 'us-east-2'
    ECR_URI    = '180840261837.dkr.ecr.us-east-2.amazonaws.com/jenkins-lab'
    IMAGE_TAG  = "${BUILD_NUMBER}"
  }

  stages {

    // ── 1. CHECKOUT ────────────────────────────────────────
    stage('Checkout') {
      steps {
        git branch: 'main',
            url: 'https://github.com/https://github.com/Robert2000361/jenLab4/cicd-project.git'
      }
    }

    // ── 2. INSTALL ─────────────────────────────────────────
    stage('Install') {
      steps {
        sh '''
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
          npm ci
        '''
      }
    }

    // ── 3. TEST ────────────────────────────────────────────
    stage('Test') {
      steps {
        sh '''
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
          npm run test:ci
        '''
      }
    }

    // ── 4. SONARQUBE ───────────────────────────────────────
    stage('SonarQube Scan') {
      steps {
        withSonarQubeEnv('SonarQube') {
          sh '''
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
            npx sonar-scanner
          '''
        }
      }
    }

    // ── 5. QUALITY GATE ────────────────────────────────────
    stage('Quality Gate') {
      steps {
        timeout(time: 5, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
        }
      }
    }

    // ── 6. DOCKER BUILD ────────────────────────────────────
    stage('Docker Build') {
      steps {
        sh "docker build -t ${ECR_URI}:${IMAGE_TAG} ."
        echo "Image built: ${ECR_URI}:${IMAGE_TAG}"
      }
    }

    // ── 7. TRIVY SCAN ──────────────────────────────────────
    stage('Trivy Scan') {
      steps {
        sh """
          trivy image \
            --exit-code 1 \
            --severity CRITICAL \
            --no-progress \
            ${ECR_URI}:${IMAGE_TAG}
        """
      }
    }

    // ── 8. PUSH TO ECR ─────────────────────────────────────
    stage('Push to ECR') {
      steps {
        withAWS(credentials: 'aws-creds', region: "${AWS_REGION}") {
          sh """
            aws ecr get-login-password --region ${AWS_REGION} | \
              docker login --username AWS --password-stdin ${ECR_URI}
            docker push ${ECR_URI}:${IMAGE_TAG}
          """
        }
      }
    }

    // ── 9. DEPLOY ──────────────────────────────────────────
    stage('Deploy to EC2') {
      agent { label 'deploy' }
      steps {
        withAWS(credentials: 'aws-creds', region: "${AWS_REGION}") {
          sh """
            aws ecr get-login-password --region ${AWS_REGION} | \
              docker login --username AWS --password-stdin ${ECR_URI}

            docker stop cicd-project || true
            docker rm   cicd-project || true

            docker pull ${ECR_URI}:${IMAGE_TAG}
            docker run -d --name cicd-project -p 3000:3000 ${ECR_URI}:${IMAGE_TAG}

            echo "Deployed: ${ECR_URI}:${IMAGE_TAG}"
          """
        }
      }
    }

  }

  post {
    success { echo "✅ Pipeline passed — Build #${BUILD_NUMBER}" }
    failure  { echo "❌ Pipeline failed — Build #${BUILD_NUMBER}" }
    always   { cleanWs() }
  }

}

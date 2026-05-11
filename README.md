<div align="center">

# ⚙️ Jenkins Lab 4 — Docker Build + AWS ECR Push

### A Production-Style Jenkins Pipeline: Build on EC2 Agent, Dockerize & Push to AWS ECR

[![Jenkins](https://img.shields.io/badge/Jenkins-Pipeline-D24939?style=for-the-badge&logo=jenkins&logoColor=white)](https://www.jenkins.io/)
[![Docker](https://img.shields.io/badge/Docker-Build%20%26%20Push-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![AWS](https://img.shields.io/badge/AWS-ECR-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)](https://aws.amazon.com/ecr/)
[![EC2](https://img.shields.io/badge/AWS-EC2%20Agent-232F3E?style=for-the-badge&logo=amazonaws&logoColor=white)](https://aws.amazon.com/ec2/)
[![IAM](https://img.shields.io/badge/AWS-IAM%20Credentials-7D3C98?style=for-the-badge&logo=amazonaws&logoColor=white)](https://aws.amazon.com/iam/)
[![GitHub](https://img.shields.io/badge/GitHub-Webhook-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/)

*Build Docker images on an EC2 Jenkins Agent, authenticate securely with AWS IAM, and push versioned images automatically to Amazon ECR on every pipeline run.*

</div>

---

## 📑 Table of Contents

1. Project Overview
2. Architecture & Mental Model
3. Pipeline Flow
4. Prerequisites
5. Setup Guide
6. Jenkinsfile Explained
7. Dynamic Tagging Concept
8. Verification & Validation
9. Troubleshooting
10. Lab Summary

---

## 🎯 Project Overview

This lab demonstrates a complete CI/CD pipeline where Jenkins builds Docker images on a remote EC2 Agent and pushes them to Amazon ECR.

Every pipeline execution automatically:

- Builds application code on the EC2 Agent
- Runs install and test steps
- Creates a Docker image using the project Dockerfile
- Authenticates securely to AWS ECR using Jenkins Credentials
- Pushes the image using a unique tag based on `BUILD_NUMBER`

### Core Skill Demonstrated

You never manually build Docker images.

One Jenkins build handles:

**Code → Test → Docker Build → ECR Push**

---

## 🏛 Architecture & Mental Model

```text
Developer (Local)
│
│  git push origin main
▼
┌─────────────┐       Webhook Trigger      ┌────────────────────────┐
│   GitHub    │ ─────────────────────────▶ │     Jenkins Master     │
│ (jenLab4)   │                            │ (Pipeline Controller)  │
└─────────────┘                            └──────────┬─────────────┘
                                                      │
                                            SSH (node-agent)
                                                      │
                                                      ▼
                                     ┌────────────────────────┐
                                     │    AWS EC2 Agent       │
                                     │                        │
                                     │ ┌────────────────────┐ │
                                     │ │   Docker Engine    │ │
                                     │ │   Node.js & Java   │ │
                                     │ │   AWS CLI          │ │
                                     │ └──────────┬─────────┘ │
                                     └────────────┼───────────┘
                                                  │
                                        docker push (IAM)
                                                  │
                                                  ▼
                                     ┌────────────────────────┐
                                     │   Amazon ECR (Cloud)   │
                                     │                        │
                                     │ ┌────────────────────┐ │
                                     │ │ jenkins-lab:11     │ │
                                     │ │ jenkins-lab:12     │ │
                                     │ │ jenkins-lab:13     │ │
                                     │ └────────────────────┘ │
                                     └────────────────────────┘
```

---

## 🔄 Pipeline Flow

1. Developer pushes code to `main`
2. GitHub triggers Jenkins via Webhook
3. Jenkins Master delegates build to `node-agent`
4. EC2 Agent clones the repository
5. `npm install` and `npm test` validate code quality
6. Docker image is built from the local Dockerfile
7. Jenkins logs into AWS ECR using stored credentials
8. Image is pushed using `${BUILD_NUMBER}` as the tag

---

## 🛠 Prerequisites

- Jenkins Master installed and running
- AWS Account
- Ubuntu 22.04 EC2 instance as Build Agent
- Docker installed on EC2 Agent
- AWS CLI installed
- Plugins:
  - Docker Pipeline
  - AWS Credentials
  - Pipeline: AWS Steps

---

## 🚀 Setup Guide

### Step 1 — Prepare the EC2 Build Agent

```bash
sudo apt update
sudo apt install -y openjdk-21-jdk
sudo apt install -y docker.io
sudo usermod -aG docker ubuntu
sudo apt install -y awscli
```

Reconnect SSH after adding user to Docker group.

Verify:

```bash
docker ps
aws --version
java -version
```

---

### Step 2 — Configure Jenkins Agent

```text
Manage Jenkins
→ Nodes
→ New Node

Name: EC2-Agent
Label: node-agent
Launch method: Launch agents via SSH
```

---

### Step 3 — Create AWS ECR Repository

```text
AWS Console
→ ECR
→ Create Repository

Visibility: Private
Repository Name: jenkins-lab
```

Copy the full ECR URI:

```text
123456789.dkr.ecr.us-east-1.amazonaws.com/jenkins-lab
```

---

### Step 4 — Create IAM User

```text
AWS Console
→ IAM
→ Users
→ Create User

Username:
jenkins-ecr-user
```

Attach policy:

```text
AmazonEC2ContainerRegistryFullAccess
```

Generate:

- Access Key ID
- Secret Access Key

Save them immediately.

---

### Step 5 — Store AWS Credentials in Jenkins

```text
Manage Jenkins
→ Credentials
→ Global
→ Add Credentials
```

Use:

```text
Kind: AWS Credentials
ID: aws-creds
Access Key ID: AKIA...
Secret Access Key: ********
```

---

### Step 6 — Create the Pipeline Job

```text
New Item
→ Pipeline
→ lab4-docker-ecr
```

Under Pipeline:

```text
Definition:
Pipeline script from SCM

SCM:
Git

Repository URL:
https://github.com/Robert2000361/jenLab4.git

Branch:
*/main
```

---

## 📄 The Jenkinsfile Explained

```groovy
pipeline {
  agent { label 'node-agent' }

  environment {
    AWS_REGION = 'us-east-2'
    ECR_URI    = '180840261837.dkr.ecr.us-east-2.amazonaws.com/jenkins-lab'
    IMAGE_TAG  = "${BUILD_NUMBER}"
  }

  stages {

    stage('Docker Build') {
      steps {
        sh "docker build -t ${ECR_URI}:${IMAGE_TAG} ."
      }
    }

    stage('Push to ECR') {
      steps {
        withAWS(credentials: 'aws-creds', region: "${AWS_REGION}") {
          sh '''
            aws ecr get-login-password --region ${AWS_REGION} | \
              docker login --username AWS --password-stdin ${ECR_URI}

            docker push ${ECR_URI}:${IMAGE_TAG}
          '''
        }
      }
    }
  }
}
```

---

## 🏷 Dynamic Tagging Concept

Instead of using:

```text
latest
```

we use:

```text
BUILD_NUMBER
```

Example:

```text
jenkins-lab:45
```

### Why?

### Traceability

Know exactly which Jenkins build created the image.

### Rollback

If build 46 fails, deploy build 45 instantly.

### Immutability

Each tag is permanent and never overwritten.

---

## ✅ Verification & Validation

After build success:

```text
AWS Console
→ ECR
→ Repositories
→ jenkins-lab
→ Images
```

You should see:

```text
jenkins-lab:11
jenkins-lab:12
jenkins-lab:13
```

Each build creates a new image.

Running Build Now again should create another tag.

---

## ⚠️ Troubleshooting

| Problem | Cause | Solution |
|---|---|---|
| aws: not found | AWS CLI missing | Install awscli on EC2 Agent |
| docker permission denied | User not in docker group | Run usermod and reconnect |
| Login Failed | Wrong region or credentials | Verify AWS_REGION + keys |
| no basic auth credentials | Wrong Jenkins credential ID | Ensure `aws-creds` matches |
| Cannot connect to ECR | Region mismatch | ECR and Jenkinsfile must match |
| Agent Offline | SSH issue | Check Port 22 + SSH key |

---

## 📘 Lab Summary

| What You Did | Why It Matters |
|---|---|
| Installed Docker on EC2 Agent | Builds happen where tools exist |
| Created ECR repository | Private secure image registry |
| Created IAM user | Security best practice |
| Stored credentials in Jenkins | Secrets never hardcoded |
| Built Docker image | Reproducible deployment |
| Tagged with BUILD_NUMBER | Easy rollback and traceability |
| Pushed automatically to ECR | Zero manual deployment steps |

---

<div align="center">

# Jenkins Lab 4 — Docker Build + AWS ECR Push

*Every build should leave behind something deployable.*

Built with ☕, Docker layers, and far too many Jenkins console logs.

</div>

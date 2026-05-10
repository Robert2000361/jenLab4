# CI/CD Project — Docker + ECR + Deploy + Trivy + SonarQube

## 📁 Project Structure

```
cicd-project/
├── app.js                   ← Calculator app
├── app.test.js              ← 5 Unit Tests
├── package.json
├── Dockerfile
├── sonar-project.properties ← SonarQube config
├── Jenkinsfile              ← Full 9-stage pipeline
├── .gitignore
└── README.md
```

---

## 🔄 Pipeline Stages

```
1. Checkout      → clone from GitHub
2. Install       → npm ci
3. Test          → npm test
4. SonarQube     → code quality scan
5. Quality Gate  → pass or fail
6. Docker Build  → build image
7. Trivy Scan    → security scan
8. Push to ECR   → push image
9. Deploy        → run on Deploy EC2
```

---

## ⚙️ Setup Steps

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/cicd-project.git
git push -u origin main
```

---

### Step 2 — Run SonarQube

```bash
docker run -d \
  --name sonarqube \
  -p 9000:9000 \
  sonarqube:community
```

Open: http://localhost:9000
- Login: `admin` / `admin`
- Change password when prompted
- Create Project → Manual → name: `cicd-project`
- Generate Token → copy it

---

### Step 3 — Configure SonarQube in Jenkins

```
Manage Jenkins → Plugins → install: SonarQube Scanner
Manage Jenkins → System → SonarQube Servers → Add
  Name:  SonarQube
  URL:   http://sonarqube:9000
  Token: (paste token from Step 2)

Manage Jenkins → Tools → SonarQube Scanner → Add
  Name: sonar
```

---

### Step 4 — Install Trivy on Build EC2 Agent

```bash
ssh -i key.pem ubuntu@BUILD_EC2_IP

sudo apt install -y wget apt-transport-https gnupg

wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key \
  | sudo apt-key add -

echo "deb https://aquasecurity.github.io/trivy-repo/deb generic main" \
  | sudo tee /etc/apt/sources.list.d/trivy.list

sudo apt update
sudo apt install -y trivy

trivy --version
```

---

### Step 5 — Create ECR Repository

```
AWS Console → ECR → Create Repository
  Name: cicd-project
  Type: Private

Copy the URI:
  123456789.dkr.ecr.us-east-1.amazonaws.com/cicd-project
```

Update `Jenkinsfile` line:
```groovy
ECR_URI = 'YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/cicd-project'
```

---

### Step 6 — Add AWS Credentials in Jenkins

```
Manage Jenkins → Credentials → Global → Add
  Kind:      AWS Credentials
  ID:        aws-creds
  AccessKey: YOUR_AWS_ACCESS_KEY
  SecretKey: YOUR_AWS_SECRET_KEY
```

---

### Step 7 — Setup Deploy EC2

Launch a second EC2 (Ubuntu 22.04) then:

```bash
ssh -i key.pem ubuntu@DEPLOY_EC2_IP

sudo apt update
sudo apt install -y openjdk-21-jdk docker.io awscli
sudo usermod -aG docker ubuntu
```

Add as Jenkins Agent:
```
Manage Jenkins → Nodes → New Node
  Name:                deploy-ec2
  Remote root dir:     /home/ubuntu
  Labels:              deploy
  Launch method:       SSH
  Host:                DEPLOY_EC2_IP
  Credentials:         SSH key
  Host Key Verify:     Non verifying
```

---

### Step 8 — Create Pipeline in Jenkins

```
New Item → cicd-project → Pipeline → OK

Pipeline section:
  Definition:  Pipeline script from SCM
  SCM:         Git
  URL:         https://github.com/YOUR_USERNAME/cicd-project.git
  Branch:      */main
  Script Path: Jenkinsfile

Save → Build Now
```

---

### Step 9 — Update Jenkinsfile

Replace these values in `Jenkinsfile`:

```groovy
ECR_URI = 'YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/cicd-project'

git url: 'https://github.com/YOUR_USERNAME/cicd-project.git'
```

Push the change:
```bash
git add Jenkinsfile
git commit -m "update ECR URI and repo URL"
git push origin main
```

---

## 🔑 Jenkins Credentials Needed

| ID | Type | Used for |
|----|------|----------|
| `aws-creds` | AWS Credentials | ECR login + push |

---

## 🖥️ Jenkins Agents Needed

| Label | Purpose |
|-------|---------|
| `EC2-Linux` | Build, Test, SonarQube, Docker Build, Trivy, Push |
| `deploy` | Pull from ECR + Run container |

---

## ✅ Expected Result

Every `git push` to `main`:

```
GitHub → Webhook → Jenkins
  → Checkout ✅
  → Install  ✅
  → Test     ✅  (5 tests pass)
  → SonarQube ✅
  → Quality Gate ✅
  → Docker Build ✅
  → Trivy Scan ✅
  → Push to ECR ✅
  → Deploy ✅
```
# jenLab4

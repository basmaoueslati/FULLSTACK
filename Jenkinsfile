pipeline {
    agent any
    environment {
        DOCKER_REGISTRY = '35.180.88.60'
        KUBE_NAMESPACE = 'fullstack-app'
        VERSION = "${env.BUILD_ID}-${env.GIT_COMMIT.take(8)}"
        REPO_URL = "git@github.com:basmaoueslati/FULLSTACK.git"  
        BRANCH_NAME = "main" 
  
    }
    stages {
        // CI PHASE
        stage('Build & Test Frontend') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npm run build'
                    sh 'xvfb-run npx ng test --watch=false --browsers=ChromeHeadlessNoSandbox'
                }
            }
        }
        stage('Start MySQL for Tests') {
                steps {
                    sh '''
                    docker run -d --name mysql-test \
                      -e MYSQL_ROOT_PASSWORD=root \
                      -e MYSQL_DATABASE=mydb \
                      -p 3306:3306 \
                      mysql:8.0
                    
                    echo "Waiting for MySQL to be available..."
                    for i in {1..20}; do
                      docker exec mysql-test mysql -uroot -e "SHOW DATABASES;" && break
                      sleep 3
                    done
                    '''
                }
            }


        stage('Build Backend') {
            steps {
                sh 'mvn clean package -DskipTests=true'
            }
        }
        stage('Test Backend') {
            steps {
                sh 'mvn test'
            }
        }
        
        stage('Quality Gates') {
            parallel {
                stage('SonarQube Backend') {
                    steps {
                        dir('backend_app'){
                        withSonarQubeEnv('SonarQube') {
                     sh '''
                       mvn clean verify sonar:sonar \
                      -Dsonar.projectKey= backend \

                       '''
                        }
                    }
                    }
                }
                stage('SonarQube Frontend') {
                    steps {
                        dir('frontend') {
                            withSonarQubeEnv('SonarQube') {
                                sh 'sonar-scanner -Dsonar.projectKey=frontend'
                            }
                        }
                    }
                }
            }
        }
        
        // CD PHASE
        stage('Build & Push Docker Images') {
            steps {
                script {
                    // Build and push Frontend
                    docker.build("${DOCKER_REGISTRY}/frontend:${VERSION}", "./frontend")
                    docker.withRegistry('https://${DOCKER_REGISTRY}', 'nexus-credentials') {
                        docker.image("${DOCKER_REGISTRY}/frontend:${VERSION}").push()
                    }
                    
                    // Build and push Backend
                    docker.build("${DOCKER_REGISTRY}/backend:${VERSION}", "./backend")
                    docker.withRegistry('https://${DOCKER_REGISTRY}', 'nexus-credentials') {
                        docker.image("${DOCKER_REGISTRY}/backend:${VERSION}").push()
                    }
                }
            }
        }
        
        stage('Deploy to Kubernetes') {
            when {
                branch 'main' // Or your production branch
            }
            steps {
                // Use Ansible for deployment
                ansiblePlaybook(
                    playbook: 'ansible/deploy-k8s.yaml',
                    inventory: "ansible/inventories/${env.ENVIRONMENT}.ini",
                    extras: """
                        -e version=${VERSION} \
                        -e kube_namespace=${KUBE_NAMESPACE} \
                        -e docker_registry=${DOCKER_REGISTRY}
                    """
                )
                
                // Verify deployment
                sh """
                    kubectl -n ${KUBE_NAMESPACE} rollout status deployment/frontend --timeout=300s
                    kubectl -n ${KUBE_NAMESPACE} rollout status deployment/backend --timeout=300s
                """
            }
        }
    }
            post {
                always {
                    sh 'docker rm -f mysql-test || true'
                }
                failure {
                    slackSend channel: '#alerts', message: "Build ${currentBuild.currentResult}: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
                }
            }
}

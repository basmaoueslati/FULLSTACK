pipeline {
    agent any
    environment {
        DOCKER_REGISTRY = 'nexus.yourcompany.com'
        KUBE_NAMESPACE = 'fullstack-app'
        VERSION = "${env.BUILD_ID}-${env.GIT_COMMIT.take(8)}"
    }
    stages {
        // CI PHASE
        stage('Build & Test Frontend') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npm run build'
                    sh 'npm test'
                }
            }
        }
        
        stage('Build & Test Backend') {
            steps {
                dir('backend') {
                    sh 'mvn clean package'
                    sh 'mvn test'
                }
            }
        }
        
        stage('Quality Gates') {
            parallel {
                stage('SonarQube Backend') {
                    steps {
                        withSonarQubeEnv('sonar-server') {
                            sh 'mvn sonar:sonar'
                        }
                    }
                }
                stage('SonarQube Frontend') {
                    steps {
                        dir('frontend') {
                            withSonarQubeEnv('sonar-server') {
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
            cleanWs()
        }
        failure {
            slackSend channel: '#alerts', message: "Build ${currentBuild.currentResult}: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }
    }
}
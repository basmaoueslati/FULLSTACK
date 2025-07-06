
pipeline {
    agent any
    environment {
        DOCKER_REGISTRY = '51.44.166.2'
        KUBE_NAMESPACE = 'fullstack-app'
        //VERSION = "${env.BUILD_ID}-${env.GIT_COMMIT.take(8)}"
        REPO_URL = "git@github.com:basmaoueslati/FULLSTACK.git"  
        BRANCH_NAME = "main" 
          
        stage('Calculate Version') {
                    steps {
                        script {
                      dir('backend_app') {

                            // Read current version from POM
                            CURRENT_VERSION = sh(
                                script: 'mvn help:evaluate -Dexpression=revision -q -DforceStdout',
                                returnStdout: true
                            ).trim()
                            
                            // Parse and increment version
                            def parts = CURRENT_VERSION.split('\\.')
                            def newPatch = (parts[2] as Integer) + 1
                            NEXT_VERSION = "${parts[0]}.${parts[1]}.${newPatch}"
                            
                            echo "Updating version: ${CURRENT_VERSION} → ${NEXT_VERSION}"
                      }
                        }
                    }
                }
        // Set version in POM
        stage('Set Version') {
            steps {
                dir('backend_app') {

                sh "mvn versions:set-property -Dproperty=revision -DnewVersion=${NEXT_VERSION}"
                sh "mvn versions:commit"
                
                sh """
                # Configure Git user
                git config --local user.email "basma.oueslati@gmail.com"
                git config --local user.name "Jenkins"
                
                # Add and commit changes
                git add pom.xml
                git commit -m "Bump version to ${NEXT_VERSION}"
                """
                }
            }
        }
        stage('Push Changes') {
            steps {
                sshagent(['github-ssh-key']) {  
                    sh """
                    git pull origin ${BRANCH_NAME} || true
                    git push origin HEAD:${BRANCH_NAME}
                    """
                }
            }
        }
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

        stage('Build Backend') {
              steps {
                dir('backend_app'){
                sh 'mvn clean package -DskipTests=true'
                }
            }
        }
        stage('Test Backend') {
            environment {
                SPRING_PROFILES_ACTIVE = 'test-no-db'
            }
            steps {
                dir('backend_app') {
                    sh 'mvn test'
                }
            }
        }
        
        stage('Quality Gates') {
            parallel {
            stage('SonarQube Backend') {
                steps {
                    dir('backend_app') {
                        withSonarQubeEnv('SonarQube') {
                            sh '''
                                mvn clean verify sonar:sonar \
                                  -Dsonar.projectKey=backend
                            '''
                        }
                        timeout(time: 15, unit: 'MINUTES') {
                            waitForQualityGate abortPipeline: true
                        }
                    }
                }
            }
            stage('SonarQube Frontend') {
                steps {
                    dir('frontend') {
                        withSonarQubeEnv('SonarQube') {
                            sh '''
                                sonar-scanner \
                                  -Dsonar.projectKey=frontend \
                                  -Dsonar.sources=.
                            '''
                        }
                        timeout(time: 15, unit: 'MINUTES') {
                            waitForQualityGate abortPipeline: true
                        }
                    }
                }
            }
            }
        }
        
        // CD PHASE
               stage('Upload JAR to Nexus') {
            steps {
                dir('backend_app') {
                    nexusArtifactUploader artifacts: [[
                        artifactId: 'backend-app',
                        file: "target/demo-${NEXT_VERSION}.jar",
                        type: 'jar'
                    ]],
                    credentialsId: 'nexus',
                    groupId: 'com.example',
                    nexusUrl: '51.44.166.2:8081',
                    nexusVersion: 'nexus3',
                    protocol: 'http',
                    repository: 'backend',
                    version: "${NEXT_VERSION}"
                }
            }
        }
                stage('Docker Build & Push via Ansible') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'docker',
                        usernameVariable: 'DOCKER_USERNAME',
                        passwordVariable: 'DOCKER_PASSWORD'
                    )
                ]) {
                    sh """
                        ansible-playbook ansible/playbook-delivery.yml \
                        -e build_context=${WORKSPACE} \
                        -e NEXT_VERSION=${NEXT_VERSION}
                    """
                }
            }
        }
                stage('Clean Old Docker Images') {
            steps {
                sh 'docker image prune -f'
                sh '''
                    docker images --filter=reference='basmaoueslati/*' --format '{{.ID}}' \
                    | xargs -r docker rmi -f
                '''
            }
        }
      //  stage('Build & Push Docker Images') {
        //    steps {
          //      script {
            //        // Build and push Frontend
              //      docker.build("${DOCKER_REGISTRY}/frontend:${VERSION}", "./frontend")
                //    docker.withRegistry('https://${DOCKER_REGISTRY}', 'nexus') {
                  //      docker.image("${DOCKER_REGISTRY}/frontend:${VERSION}").push()
                    //}
                    
                    // Build and push Backend
                   // docker.build("${DOCKER_REGISTRY}/backend:${VERSION}", "./backend")
                    //docker.withRegistry('https://${DOCKER_REGISTRY}', 'nexus') {
                      //  docker.image("${DOCKER_REGISTRY}/backend:${VERSION}").push()
                    //}
                //}
            ///}
        //}
        
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
                        -e version=${NEXT_VERSION} \
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

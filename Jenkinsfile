pipeline {
    agent any
    environment {
        DOCKER_REGISTRY = '51.44.166.2:8081'
        KUBE_NAMESPACE = 'fullstack-app'
        //VERSION = "${env.BUILD_ID}-${env.GIT_COMMIT.take(8)}"
        REPO_URL = "git@github.com:basmaoueslati/FULLSTACK.git"  
        BRANCH_NAME = "main" 
    }
         stages {
             stage('Setting version & push changes'){
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

                //set version in POM
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
                //Push Changes
                  sshagent(['github-ssh-key']) {
                            sh '''
                                git remote set-url origin git@github.com:basmaoueslati/FULLSTACK.git
                                git pull origin ${BRANCH_NAME} || true
                                git push origin HEAD:${BRANCH_NAME}
                            '''
                        }

                    }
                }
                      }
                        }
    
        // CI PHASE
             stage('Build & test'){
                 parallel {
        stage('Build & Test Frontend') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npm run build'
                    sh 'xvfb-run npx ng test --watch=false --browsers=ChromeHeadlessNoSandbox'
                }
            }
        }

        stage('Build & Test Backend') {
            environment {
                SPRING_PROFILES_ACTIVE = 'test-no-db'
            }
              steps {
                dir('backend_app'){
                sh 'mvn clean package -DskipTests=true'
                sh 'mvn test'
                }
            }
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
               stage('Upload backend to Nexus') {
            steps {
                dir('backend_app') {
                    nexusArtifactUploader artifacts: [[
                        artifactId: 'demo',
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
             stage('Upload Frontend to Nexus') {
    steps {
        dir('frontend/dist') {
            sh "tar -czf frontend-${NEXT_VERSION}.tar.gz *"
        }
        nexusArtifactUploader artifacts: [[
            artifactId: 'frontend',
            file: "frontend/dist/frontend-${NEXT_VERSION}.tar.gz",
            type: 'tar.gz'
        ]],
        credentialsId: 'nexus',
        groupId: 'com.example.frontend',
        nexusUrl: '51.44.166.2:8081',
        nexusVersion: 'nexus3',
        protocol: 'http',
        repository: 'frontend',
        version: "${NEXT_VERSION}"
    }
}
                stage('Pre-Build Docker Cleanup') {
                    steps {
                        sh '''
                            docker system prune -a -f --volumes
                        '''
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
                  ansible-playbook -vvv ansible/playbook-delivery.yml \
                    -e build_context=${WORKSPACE} \
                    -e NEXT_VERSION=${NEXT_VERSION} \
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
        
                stage('Deploy to Kubernetes') {
                    when {
                        branch 'main'
                    }
                    steps {
                        ansiblePlaybook(
                            playbook: 'ansible/deploy-k8s.yaml',
                            inventory: 'ansible/dev.ini',
                            credentialsId: 'ssh-jenkins-Masterk8s', // Use the SSH key stored in Jenkins
                            extras: """
                                -e version=${NEXT_VERSION} \
                                -e docker_registry=${DOCKER_REGISTRY}
                            """
                        )
                
                        sh """
                            kubectl rollout status deployment/frontend --timeout=300s
                            kubectl rollout status deployment/backend --timeout=300s
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


pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {

        stage('Check Environment') {
            steps {
                echo 'Checking Java and Node.js versions'

                sh '''
                    java -version
                    node --version
                    npm --version
                '''
            }
        }

        stage('Node.js Tests') {
            steps {
                echo 'Running Hospital Management Node.js tests'

                sh 'npm test'
            }
        }

        stage('Spring Boot Build and Tests') {
            steps {
                echo 'Building Spring Boot application'

                dir('backend') {
                    sh '''
                        chmod +x mvnw
                        ./mvnw -B clean verify
                    '''
                }
            }
        }

        stage('Archive Build') {
            steps {
                echo 'Archiving Spring Boot JAR'

                archiveArtifacts(
                    artifacts: 'backend/target/*.jar',
                    fingerprint: true
                )
            }
        }
    }

    post {
        success {
            echo 'Hospital Management CI Pipeline completed successfully!'
        }

        failure {
            echo 'Pipeline failed. Please check the Jenkins console output.'
        }
    }
}

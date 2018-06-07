pipeline {

    agent any

    stages {

        stage ('build') {
            agent { label 'james-bond' }
            when { 
                expression { return env.BRANCH_NAME == 'develop'; }
            }
            steps {
                checkout scm
                sh "npm i"
                sh "npm run build"
                script {
                    GIT_SHORT_SHA = sh ( script: "git rev-parse --short HEAD", returnStdout: true ).trim()
                    sh "echo ${GIT_SHORT_SHA} > ./dist/SHA.txt"
                }
            }
        }

        stage ('test'){
            agent { label 'windows' }
            when { 
                expression { return env.BRANCH_NAME == 'develop'; }
            }
            steps {
                checkout scm
                sh "npm i"
                sh "npm test"
            }
        }
    }
}
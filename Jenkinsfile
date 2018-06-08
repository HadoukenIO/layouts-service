pipeline {

    agent any

    stages {

        stage ('build') {
            agent { label 'james-bond' }
            when { branch "develop" }
            steps {
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
            when { not { branch "develop" } }
            steps {
                sh "where node"
                sh "where npm"
                sh "npm i"
                sh "npm test"
            }
        }
    }
}
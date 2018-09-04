pipeline {

    agent any

    stages {

        stage ('build') {
            agent { label 'linux-slave' }
            when { branch "develop" }
            steps {
                sh "npm i"
                sh "npm run build"
                script {
                    GIT_SHORT_SHA = sh ( script: "git rev-parse --short HEAD", returnStdout: true ).trim()
                    VERSION = sh ( script: "node -pe \"require('./package.json').version\"", returnStdout: true ).trim()
                    S3_LOC = env.DSERVICE_S3_ROOT_STAGING + "layouts/" + VERSION + "-" + env.BUILD_NUMBER
                }
                sh "echo ${GIT_SHORT_SHA} > ./dist/SHA.txt"
                sh "aws s3 cp ./dist ${S3_LOC}/ --recursive"
            }
        }

        stage ('test'){
            agent { label 'win10-dservices' }
            when { not { branch "develop" } }
            steps {
                bat "npm i"
                bat "npm test"
            }
        }
    }
}
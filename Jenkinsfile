pipeline {

    agent any

    stages {

        stage ('build') {
            agent { label 'linux-slave' }
            when { branch "develop" }
            steps {
                sh "npm i --ignore-scripts"
                script {
                    GIT_SHORT_SHA = sh ( script: "git rev-parse --short HEAD", returnStdout: true ).trim()
                    S3_LOC = env.DSERVICE_S3_ROOT + "layouts/" + GIT_SHORT_SHA
                    STAGING_JSON = env.DSERVICE_S3_ROOT + "layouts/" + "app.staging.json"
                    LAYOUTSMANAGER_STAGING_JSON = env.DSERVICE_S3_ROOT + "layouts/layoutsManager/" + "app.staging.json"
                }
                sh "GIT_SHORT_SHA=${GIT_SHORT_SHA} node scripts/build prod"
                sh "echo ${GIT_SHORT_SHA} > ./dist/SHA.txt"
                sh "aws s3 cp ./dist ${S3_LOC}/ --recursive"
                sh "aws s3 cp ./dist/app.json ${STAGING_JSON}"
                sh "aws s3 cp ./dist/layoutsManager/app.json ${LAYOUTSMANAGER_STAGING_JSON}"
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
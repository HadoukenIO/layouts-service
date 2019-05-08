pipeline {
    agent none
    options { timestamps() }

    stages {
        stage('Input') {
            when {
                branch 'master'
                beforeInput true
            }
            steps {
                script {
                    env.DEPLOY_CLIENT = input \
                        message: 'Would you like to deploy the client to NPM?', \
                        parameters: [choice(name: 'DEPLOY_CLIENT', choices: ['Yes', 'No'], description: '')]
                }
            }
        }

        stage('Test') {
            parallel {
                stage('Unit Tests') {
                    agent { label 'linux-slave' }
                    steps {
                        sh "npm install --ignore-scripts"
                        sh "npm run generate"
                        sh "npm run test:unit -- --color=false --no-cache --verbose"
                        sh "npm run check"
                    }
                    post {
                        always {
                            junit "dist/test/results-unit.xml"
                        }
                    }
                }

                stage('Integration Tests') {
                    agent { label 'win10-dservices' }
                    steps {
                        bat "npm install"
                        bat "npm run test:int -- --color=false --no-cache --verbose"
                    }
                    post {
                        always {
                            junit "dist/test/results-int.xml"
                        }
                    }
                }
            }
        }

        stage('Build') {
            agent { label 'linux-slave' }
            steps {
                configure()

                buildProject()
                addReleaseChannels()
            }
        }

        stage('Deploy') {
            agent { label 'linux-slave' }
            when { anyOf { branch 'develop' ; branch 'master' } }
            steps {
                deployToS3()
                deployToNPM()
            }
        }
    }
}

def configure() {
    def config = readJSON file: './services.config.json'
    def manifest = readJSON file: './package.json'

    GIT_SHORT_SHA = GIT_COMMIT.substring(0, 7)
    PKG_VERSION = manifest.version
    SERVICE_NAME = config.SERVICE_NAME

    if (env.BRANCH_NAME == 'master') {
        BUILD_VERSION = PKG_VERSION
        CHANNEL = 'stable'
        MANIFEST_NAME = 'app.json'
    } else {
        BUILD_VERSION = PKG_VERSION + '-alpha.' + env.BUILD_NUMBER
        CHANNEL = 'staging'
        MANIFEST_NAME = 'app.staging.json'
    }

    DIR_BUILD_ROOT = env.DSERVICE_S3_ROOT + SERVICE_NAME + '/'
    DIR_BUILD_VERSION = DIR_BUILD_ROOT + BUILD_VERSION

    DIR_DOCS_ROOT = env.DSERVICE_S3_ROOT_DOCS + SERVICE_NAME + '/'
    DIR_DOCS_CHANNEL = DIR_DOCS_ROOT + CHANNEL
    DIR_DOCS_VERSION = DIR_DOCS_ROOT + BUILD_VERSION
}

def buildProject() {
    sh "npm install --ignore-scripts"
    sh "npm run clean"
    sh "SERVICE_VERSION=${BUILD_VERSION} npm run build"
    sh "echo ${GIT_SHORT_SHA} > ./dist/SHA.txt"

    sh "npm run zip"
    sh "npm install bootprint@2.0.1 bootprint-json-schema@2.0.0-rc.3 --no-save"
    sh "npm run docs"
}

def addReleaseChannels() {
    if (env.BRANCH_NAME == 'master') {
        sh "npm run channels"
    }
}

def deployToS3() {
    sh "aws s3 cp ./res/provider ${DIR_BUILD_VERSION}/ --recursive"
    sh "aws s3 cp ./dist/provider ${DIR_BUILD_VERSION}/ --recursive"
    sh "aws s3 cp ./dist/client/openfin-${SERVICE_NAME}.js ${DIR_BUILD_VERSION}/"

    sh "aws s3 cp ./dist/docs ${DIR_DOCS_CHANNEL} --recursive"
    sh "aws s3 cp ./dist/docs ${DIR_DOCS_VERSION} --recursive"

    sh "aws s3 cp ./dist/provider/app.json ${DIR_BUILD_ROOT}${MANIFEST_NAME}"
    sh "aws s3 cp ./dist/provider/ ${DIR_BUILD_ROOT} --exclude \"*\" --include \"app.runtime-*.json\""
}

def deployToNPM() {
    if (env.DEPLOY_CLIENT != 'No') {
        withCredentials([string(credentialsId: 'NPM_TOKEN_WRITE', variable: 'NPM_TOKEN')]) {
            sh "echo //registry.npmjs.org/:_authToken=$NPM_TOKEN > $WORKSPACE/.npmrc"
        }

        if (BUILD_VERSION == PKG_VERSION) {
            // Assume production release
            echo "publishing to npm, version: ${BUILD_VERSION}"
            sh "npm publish"
        } else {
            // Assume staging release, and tag as 'alpha'
            echo "publishing pre-release version to npm: ${BUILD_VERSION}"
            sh "npm version --no-git-tag-version ${BUILD_VERSION}"
            sh "npm publish --tag alpha"
            sh "npm version --no-git-tag-version ${PKG_VERSION}"
        }
    }
}

/// <reference path="../typings/index.d.ts" />
/// <reference path="../typings/tsd.d.ts" />
import * as encoder from "../lib/serverEncoder"
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as assert from "assert";
import * as https from "https";

const TEST_FOLDER: string = "testFolder" + path.sep;
const AUDIO_FILE: string = __dirname + path.sep + "assets" + path.sep + "audio.m4a";
const IMAGE_FILE: string = __dirname + path.sep + "assets" + path.sep + "img.png";
const AUDIO_URL: string = "https://d2mxb5cuq6ityb.cloudfront.net/Demo-Geico.m4a";
const REDIRECT_AUDIO_URL: string = "http://traffic.libsyn.com/bespoken/Introduction.mp3";
const IMAGE_URL: string = "https://xapp-wpengine.netdna-ssl.com/wp-content/themes/xapp/assets/images/logo.png";
/**
 * This is actually an AAC file but it is an m4a in disguise.  Testing a crash that was in the encoder that is caused by it. 
 */
const AAC_AUDIO_FILE: string = "https://s3.amazonaws.com/bespoken/encoded/ContentPromoPromptBad.m4a";
const NO_FILE_URL: string = "http://noooo.file.exists/Demo-Geico.m4a";

const TEST_BUCKET: string = "bespoken/encoder/test";
const TEST_PUBLIC_BUCKET: string = "bespoken/encoder/test_public";

/**
 * Unit and integration tests for the ServerEncoder scope.  This requires aws keys in order to
 * run. It will take the credentials either from the environment variables AWS_KEY and AWS_SECRET or 
 * from aws cli from the "~/.aws" folder. The environment variables take
 * precedence. Currently it will only take the default one. Multiple profile support would need to be added. 
 */
describe("ServerEncoder", () => {
    var TEST_KEY: string = "testKey.mp3";
    var ACCESS_ID: string = "";
    var SECRET: string = "";

    before(function() {
        let configs: Map<string, string> = getVariables();
        ACCESS_ID = configs.get("aws_access_key_id");
        SECRET = configs.get("aws_secret_access_key");
    })

    describe("encoder", () => {
        it("Tests the full \"encoder\" method with valid input to ensure that the file has been sent to the S3 bucket.", (done: MochaDone) => {
            let params: encoder.Encoder.Params = {
                sourceUrl: AUDIO_URL, 
                targetBucket: TEST_BUCKET, 
                targetKey: TEST_KEY, 
                accessKeyId: ACCESS_ID, 
                accessSecret: SECRET }
            encoder.Encoder.encode(params, (err: Error, url: String) => {
                if (err) {
                    done(err);
                } else {
                    if (url == null) {
                        done(Error("Url provided was null when no error was thrown."));
                    } else {
                        assert.equal(url, "https://s3.amazonaws.com/" + TEST_BUCKET + "/" + TEST_KEY);
                        done();
                    }
                }
            });
        });

        it("Tests the full \"encoder\" method with valid input to a redirect URL to ensure that the file has been sent to the S3 bucket.", (done: MochaDone) => {
            let params: encoder.Encoder.Params = {
                sourceUrl: REDIRECT_AUDIO_URL, 
                targetBucket: TEST_BUCKET, 
                targetKey: TEST_KEY, 
                accessKeyId: ACCESS_ID, 
                accessSecret: SECRET }
            encoder.Encoder.encode(params, (err: Error, url: String) => {
                if (err) {
                    done(err);
                } else {
                    if (url == null) {
                        done(Error("Url provided was null when no error was thrown."));
                    } else {
                        assert.equal(url, "https://s3.amazonaws.com/" + TEST_BUCKET + "/" + TEST_KEY);
                        done();
                    }
                }
            });
        });

        it("Tests the full \"encoder\" method with valid input to ensure that the file has been sent to the public S3 bucket.", (done: MochaDone) => {
            let params: encoder.Encoder.Params = {
                sourceUrl: AUDIO_URL, 
                targetBucket: TEST_PUBLIC_BUCKET, 
                targetKey: TEST_KEY }
            encoder.Encoder.encode(params, (err: Error, url: String) => {
                if (err) {
                    done(err);
                } else {
                    if (url == null) {
                        done(Error("Url provided was null when no error was thrown."));
                    } else {
                        assert.equal(url, "https://s3.amazonaws.com/" + TEST_PUBLIC_BUCKET + "/" + TEST_KEY);
                        done();
                    }
                }
            });
        });

        it("Tests the full \"encoder\" method with an ACC file to ensure that it does not crash and throws an error.", (done: MochaDone) => {
            let params: encoder.Encoder.Params = {
                sourceUrl: AAC_AUDIO_FILE, 
                targetBucket: TEST_BUCKET, 
                targetKey: TEST_KEY, 
                accessKeyId: ACCESS_ID, 
                accessSecret: SECRET }
            encoder.Encoder.encode(params, (err: Error, url: String) => {
                if (err != null) {
                    if (url) {
                        done(Error("A url of " + url + " was returned when \"null\" was expected."));
                    } else {
                        done();
                    }
                } else {
                    done(Error("No error was thrown and a url of " + url + " was returned."));
                }
            });
        });

        it("Tests the full \"encoder\" method with a bad URL.  It should return an error with no URL.", (done: MochaDone) => {
            let params: encoder.Encoder.Params = { 
                sourceUrl: IMAGE_URL, 
                targetBucket: TEST_BUCKET, 
                targetKey: TEST_KEY, 
                accessKeyId: ACCESS_ID, 
                accessSecret: SECRET }
            encoder.Encoder.encode(params, (err: Error, url: String) => {
                if (err != null) {
                    if (url) {
                        done(Error("A url of " + url + " was returned when \"null\" was expected."));
                    } else {
                        done();
                    }
                } else {
                    done(Error("No error was thrown and a url of " + url + " was returned."));
                }
            });
        });

        it("Tests the full \"encoder\" will throw an error with bad credentials to a private repo.", (done: MochaDone) => {
            let params: encoder.Encoder.Params = { 
                sourceUrl: AUDIO_URL, 
                targetBucket: TEST_BUCKET, 
                targetKey: TEST_KEY, 
                accessKeyId: ACCESS_ID, 
                accessSecret: "12345" }
            encoder.Encoder.encode(params, (err: Error, url: String) => {
                console.error(err.message);
                if (err) {
                    if (url) {
                        done(Error("An error was thrown but the URL was still return as " + url));
                    } else {
                        done();
                    }
                } else {
                    done(Error("No error was thrown and a url of " + url + " was returned."));
                }
            });
        });

        it("Checks that the full \"encoder\" will throw an error when attempting to download a local file instead of a web link.", (done: MochaDone) => {
            let params: encoder.Encoder.Params = {
                sourceUrl: IMAGE_FILE,
                targetBucket: TEST_BUCKET,
                targetKey: TEST_KEY,
                accessKeyId: ACCESS_ID,
                accessSecret: "12345"};
            encoder.Encoder.encode(params, (err: Error, url: String) => {
                if (err) {
                    if (url) {
                        done(Error("An error was thrown but the URL was still return as " + url));
                    } else {
                        done();
                    }
                } else {
                    done(Error("No error was thrown and a url of " + url + " was returned."));
                }
            });
        });

        it("Tests the full \"encoder\" will throw an error with null credentials to a private repo.", (done: MochaDone) => {
            let params: encoder.Encoder.Params = { 
                sourceUrl: AUDIO_URL, 
                targetBucket: TEST_BUCKET, 
                targetKey: TEST_KEY }
            encoder.Encoder.encode(params, (err: Error, url: String) => {
                if (err) {
                    if (url) {
                        done(Error("An error was thrown but the URL was still return as " + url));
                    } else {
                        done();
                    }
                } else {
                    done(Error("No error was thrown and a url of " + url + " was returned."));
                }
            });
        });

        it("Tests the full \"encoder\" with a remote URL to a file that doesn't exist. It should throw an error.", (done: MochaDone) => {
            let params: encoder.Encoder.Params = { 
                sourceUrl: NO_FILE_URL, 
                targetBucket: TEST_BUCKET, 
                targetKey: TEST_KEY, 
                accessKeyId: ACCESS_ID, 
                accessSecret: SECRET }
            encoder.Encoder.encode(params, (err: Error, url: String) => {
                if (err) {
                    if (url) {
                        done(Error("An error was thrown but the URL was still return as " + url));
                    } else {
                        done();
                    }
                } else {
                    done(Error("No error was thrown and a url of " + url + " was returned."));
                }
            });
        });
    });

    describe("convertFile", () => {
        it("Converts a valid audio file to a valid MP3 file without error.", (done: MochaDone) => {
            encoder.Encoder.convertFile(AUDIO_FILE, (err: Error, outputPath: string) => {
                if (err) {
                    done(err);
                } else {
                    done(verifyFile(outputPath, fs.constants.F_OK));
                }
                if (outputPath) {
                    fs.unlinkSync(outputPath);
                }
            });
        });

        it("Attempts to convert an aac file.  It should fail and throw an error with no output path.", (done: MochaDone) => {
            encoder.Encoder.convertFile(AAC_AUDIO_FILE, (err: Error, outputPath: string) => {
                if (!err) {
                    done(Error("An error was supposed to be thrown but was not thrown."));
                } else {
                    assert.equal(outputPath, null, "An output path of " + outputPath + " was produced when it should have been null.");
                    done();
                }
                if (outputPath) {
                    fs.unlinkSync(outputPath);
                }
            });
        });

        it("Attempts to convert an image file to a music file. It should fail and throw an error with no output path.", (done: MochaDone) => {
            encoder.Encoder.convertFile(IMAGE_FILE, (err: Error, outputPath: string) => {
                if (!err) {
                    done(Error("An error was supposed to be thrown but was not thrown."));
                } else {
                    assert.equal(outputPath, null, "An output path of " + outputPath + " was produced when it should have been null.");
                    done();
                }
                if (outputPath) {
                    fs.unlinkSync(outputPath);
                }
            });
        });
    });

    describe("downloadAndEncode", () => {
        it("Checks that an audio file is downloaded and encoded to a readable temporary mp3 without error.", (done: MochaDone) => {
            encoder.Encoder.downloadAndEncode(AUDIO_URL, (err: Error, outputPath: string) => {
                if (err) {
                    done(err);
                } else {
                    done(verifyFile(outputPath, fs.constants.F_OK | fs.constants.W_OK));
                }
                if (outputPath) {
                    fs.unlinkSync(outputPath);
                }
            });
        });

        it("Checks that an audio file is downloaded from a redirect url and encoded to a readable temporary mp3 without error.", (done: MochaDone) => {
            encoder.Encoder.downloadAndEncode(REDIRECT_AUDIO_URL, (err: Error, outputPath: string) => {
                if (err) {
                    done(err);
                } else {
                    done(verifyFile(outputPath, fs.constants.F_OK | fs.constants.W_OK));
                }
                if (outputPath) {
                    fs.unlinkSync(outputPath);
                }
            });
        });

        it("Checks that an error is thrown when attempting to download a file.", (done: MochaDone) => {
            encoder.Encoder.downloadAndEncode(IMAGE_FILE, (err: Error, outputPath: string) => {
                if (!err) {
                    done();
                } else {
                    assert.equal(outputPath, null, "An output path was produced when it should have been null: OutputPath = " + outputPath);
                    done();
                }
            });
        });

        it("Checks that a file is not downloaded or encoded if it is not a suitable type. It must produce an error.", (done: MochaDone) => {
            encoder.Encoder.downloadAndEncode(IMAGE_URL, (err: Error, outputPath: string) => {
                if (!err) {
                    done(Error("There was no error produced when there should have been. OutputPath = " + outputPath));
                } else {
                    assert.equal(outputPath, null, "An output path was produced when it should have been null: OutputPath = " + outputPath);
                    done();
                }
            });
        });

        it("Checks that a file is not downloaded or encoded if the URL does not point to an actual file. It must produce an error.", (done: MochaDone) => {
            encoder.Encoder.downloadAndEncode(NO_FILE_URL, (err: Error, outputPath: string) => {
                if (!err) {
                    done(Error("There was no error produced when there should have been. OutputPath = " + outputPath));
                } else {
                    assert.equal(outputPath, null, "An output path was produced when it should have been null: OutputPath = " + outputPath);
                    done();
                }
            });
        });

        it("Checks that a file is not downloaded or encoded if the URL is null. It must produce an error.", (done: MochaDone) => {
            encoder.Encoder.downloadAndEncode(null, (err: Error, outputPath: string) => {
                if (!err) {
                    done(Error("There was no error produced when there should have been. OutputPath = " + outputPath));
                } else {
                    assert.equal(outputPath, null, "An output path was produced when it should have been null: OutputPath = " + outputPath);
                    done();
                }
            });
        });
    });

    function verifyFile(path: string, mode: number): Error {
        try {
            fs.accessSync(path, mode);
        } catch(e) {
            return e;
        }
    }

    function getVariables(): Map<string, string> {
        let configs: Map<string, string> = getVariablesFromFile();
        // Retrieving environment variables to override what's in the config file.
        if (process.env.AWS_KEY) {
            configs.set("aws_access_key_id", process.env.AWS_KEY);
        }
        if (process.env.AWS_SECRET) {
            configs.set("aws_secret_access_key", process.env.AWS_SECRET);
        }

        return configs;
    } 

    function getVariablesFromFile(): Map<string, string> {
        try {
            var homeDirectory: string = os.homedir();
            var configsString: string = fs.readFileSync(homeDirectory + "/.aws/credentials", "utf8");
            return parseCreds("default", configsString);
        } catch(e) {
            return new Map<string, string>();
        }
    }

    /**
     * Simple method that parses the aws credentials file in to a map.
     * It only supports the credentials like so:
     * 
     * [profile]
     * "key" = "value"
     * "key2" = "value2"
     * 
     * @params profile The name of the profile to retrieve.
     * @params creds The entire creds text string.
     * 
     * @return A map containing the keys and their values. 
     */
    function parseCreds(profile: string, creds: string): Map<string, string> {
        let map: Map<string, string> = new Map<string, string>();
        let lines: string[] = creds.split(os.EOL);

        for (var i = 0; i < lines.length; ++i) {
            if (!lines[i].trim().match(/^\[" + profile + "\]/)) {
                if (lines[i].trim().match(/^\w+\s*=\s*.+\Z/)) {
                    let split: string[] = lines[i].split("=");
                    map.set(split[0].trim(), split[1].trim());
                }
            }
        }
        return map;
    }
});
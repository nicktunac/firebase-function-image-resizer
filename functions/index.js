'use strict';

const functions = require('firebase-functions');
const mkdirp = require('mkdirp-promise');
const gcs = require('@google-cloud/storage')();
const exec = require('child-process-promise').exec;
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);

const LOCAL_TMP_FOLDER = '/tmp/';
const FIREBASE_STORAGE_FOLDER = "images/";

// Max size of image in Pixels
const XL_SIZE = "960";
const L_SIZE = "800";
const M_SIZE = "480";
const S_SIZE = "320";
const B_SIZE = "300";

// Prefix of images
const XL_PREFIX = "xl_";
const L_PREFIX = "l_";
const M_PREFIX = "m_";
const S_PREFIX = "s_";
const BL_PREFIX = "bl_";

// JPEG File Extension
const JPEG_EXT = ".jpg";

var xlarge_w = "";
var xlarge_h = "";
var large_w = "";
var large_h = "";
var medium_w = "";
var medium_h = "";
var small_w = "";
var small_h = "";
var blur_w = "";
var blur_h = "";

exports.generateThumbnail = functions.storage.object().onChange(event => {
    const object = event.data;
    const filePath = object.name;
    const folderName = filePath.split("/")[0];
    const filePathSplit = filePath.split('/');
    const fileName = filePathSplit.pop();
    const fileNameSplit = fileName.split('.');
    const fileExtension = fileNameSplit.pop();
    const baseFileName = fileNameSplit.pop();

    // Exit if this is triggered on a file that is not an image.
    if (!object.contentType.startsWith('image/')) {
        console.log('This is not an image.');
        return;
    }

    // Exit if this is triggered on a file that is not an image.
    if (!folderName.startsWith('temp_upload') || filePath.split('/').length == 1) {
        console.log('Folder name is not in temp_upload.');
        return;
    }

    // Exit if this is a move or deletion event.
    if (object.resourceState === 'not_exists') {
        console.log('This is a deletion event.');
        return;
    }

    //console.log(JSON.stringify(object));
    console.log("Generating Images");


    // Get google cloud storage bucket
    const bucket = gcs.bucket(object.bucket);

    // Create the temp directory where the storage file will be downloaded.
    const tempLocalDir = `${LOCAL_TMP_FOLDER}`;
    const tempLocalFile = `${tempLocalDir}${fileName}`;
    return mkdirp(tempLocalDir).then(() => {
        // Download file from bucket.
        return bucket.file(filePath).download({
            destination: tempLocalFile
        }).then(() => {
            console.log('The file has been downloaded to', tempLocalFile);

            // Generate a thumbnail using ImageMagick.
            return exec(`identify -ping -format '%w %h' "${tempLocalFile}"`).then(result => {
                var imageWidth = parseInt(result.stdout.split(' ')[0])
                var imageHeight = parseInt(result.stdout.split(' ')[1])
                var isLandscape = imageWidth > imageHeight ? true : false;
                var resizeCommand = ""

                if (isLandscape) {
                    xlarge_w = XL_SIZE;
                    large_w = L_SIZE;
                    medium_w = M_SIZE;
                    small_w = S_SIZE;
                    blur_w = B_SIZE;
                } else {
                    xlarge_h = XL_SIZE;
                    large_h = L_SIZE;
                    medium_h = M_SIZE;
                    small_h = S_SIZE;
                    blur_h = B_SIZE;
                }

                // Create Small Image
                const smallFileName = `${S_PREFIX}${baseFileName}${JPEG_EXT}`
                const smallFileDirectory = `${tempLocalDir}${smallFileName}`;
                const smallUploadDestination = `${FIREBASE_STORAGE_FOLDER}${smallFileName}`
                var smallCommand = `convert "${tempLocalFile}" -resize ${small_w}x${small_h} "${smallFileDirectory}"`;

                const smallConvert = exec(smallCommand).then(() => {
                    return bucket.upload(smallFileDirectory, {
                        destination: smallUploadDestination
                    }).then(() => {
                        const downloadUrl = 'https://firebasestorage.googleapis.com/v0/b/' +
                            event.data.bucket + '/o/' + bucket.file(smallUploadDestination).id + '?alt=media&token=' +
                            event.data.metadata.firebaseStorageDownloadTokens;

                        admin.database().ref(`/images/${baseFileName}/small`).set({
                            url: downloadUrl
                        });

                        console.log('Small Image created');
                    });
                });

                // Create Medium Image
                const mediumFileName = `${M_PREFIX}${baseFileName}${JPEG_EXT}`
                const mediumFileDirectory = `${tempLocalDir}${mediumFileName}`;
                const mediumUploadDestination = `${FIREBASE_STORAGE_FOLDER}${mediumFileName}`
                var mediumCommand = `convert "${tempLocalFile}" -resize ${medium_w}x${medium_h} "${mediumFileDirectory}"`;

                const mediumConvert = exec(mediumCommand).then(() => {
                    return bucket.upload(mediumFileDirectory, {
                        destination: mediumUploadDestination
                    }).then(() => {
                        const downloadUrl = 'https://firebasestorage.googleapis.com/v0/b/' +
                            event.data.bucket + '/o/' + bucket.file(mediumUploadDestination).id + '?alt=media&token=' +
                            event.data.metadata.firebaseStorageDownloadTokens;

                        admin.database().ref(`/images/${baseFileName}/medium`).set({
                            url: downloadUrl
                        });

                        console.log('Medium Image created');
                    });
                });

                // Create Large Image
                const largeFileName = `${L_PREFIX}${baseFileName}${JPEG_EXT}`
                const largeFileDirectory = `${tempLocalDir}${largeFileName}`;
                const largeUploadDestination = `${FIREBASE_STORAGE_FOLDER}${largeFileName}`
                var largeCommand = `convert "${tempLocalFile}" -resize ${large_w}x${large_h} "${largeFileDirectory}"`;

                const largeConvert = exec(largeCommand).then(() => {
                    return bucket.upload(largeFileDirectory, {
                        destination: largeUploadDestination
                    }).then(() => {
                        const downloadUrl = 'https://firebasestorage.googleapis.com/v0/b/' +
                            event.data.bucket + '/o/' + bucket.file(largeUploadDestination).id + '?alt=media&token=' +
                            event.data.metadata.firebaseStorageDownloadTokens;

                        admin.database().ref(`/images/${baseFileName}/large`).set({
                            url: downloadUrl
                        });

                        console.log('Large Image created');
                    });
                });

                // Create XL Image
                const xlFileName = `${XL_PREFIX}${baseFileName}${JPEG_EXT}`
                const xlFileDirectory = `${tempLocalDir}${xlFileName}`;
                const xlUploadDestination = `${FIREBASE_STORAGE_FOLDER}${xlFileName}`
                var xlargeCommand = `convert "${tempLocalFile}" -resize ${xlarge_w}x${xlarge_h} "${xlFileDirectory}"`;

                const xlConvert = exec(xlargeCommand).then(() => {
                    return bucket.upload(xlFileDirectory, {
                        destination: xlUploadDestination
                    }).then(() => {
                        const downloadUrl = 'https://firebasestorage.googleapis.com/v0/b/' +
                            event.data.bucket + '/o/' + bucket.file(xlUploadDestination).id + '?alt=media&token=' +
                            event.data.metadata.firebaseStorageDownloadTokens;

                        admin.database().ref(`/images/${baseFileName}/xlarge`).set({
                            url: downloadUrl
                        });

                        console.log('XL Image created');
                    });
                });

                // Create Blur Image
                const blurFileName = `${BL_PREFIX}${baseFileName}${JPEG_EXT}`
                const blurFileDirectory = `${tempLocalDir}${blurFileName}`;
                const blurUploadDestination = `${FIREBASE_STORAGE_FOLDER}${blurFileName}`
                var blurCommand = `convert "${tempLocalFile}" -resize ${blur_w}x${blur_h} -blur 0x10 "${blurFileDirectory}"`;

                const blurConvert = exec(blurCommand).then(() => {
                    return bucket.upload(blurFileDirectory, {
                        destination: blurUploadDestination
                    }).then((file) => {

                        const downloadUrl = 'https://firebasestorage.googleapis.com/v0/b/' +
                            event.data.bucket + '/o/' + bucket.file(blurUploadDestination).id + '?alt=media&token=' +
                            event.data.metadata.firebaseStorageDownloadTokens;

                        admin.database().ref(`/images/${baseFileName}/blur`).set({
                            url: downloadUrl
                        });

                        console.log('Blur Image created');
                    });
                });

                //Promise all
                return Promise.all([blurConvert, xlConvert, largeConvert, mediumConvert, smallConvert]).then(() => {
                    console.log("All Proccess completed");
                });
            });
        });
    });
});
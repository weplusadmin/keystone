/*
TODO: CloudinaryImageType actally supports 'remove' and 'reset' actions, but
this field will only submit `""` when 'remove' is clicked. @jossmac we need to
work out whether we're going to support deleting through the UI.
*/

import React, { PropTypes } from 'react';
import Field from '../Field';
import cloudinaryResize from '../../../admin/client/utils/cloudinaryResize';
import { Button, FormField, FormInput, FormNote } from '../../../admin/client/App/elemental';

import ImageThumbnail from '../../components/ImageThumbnail';
import FileChangeMessage from '../../components/FileChangeMessage';
import HiddenFileInput from '../../components/HiddenFileInput';
import Lightbox from 'react-images';
import ReactS3Uploader from '../../components/ReactS3Uploader';

const SUPPORTED_TYPES = ['image/*', 'application/pdf', 'application/postscript'];
const SUPPORTED_REGEX = new RegExp(/^image\/|application\/pdf|application\/postscript/g);

let uploadInc = 1000;

const buildInitialState = (props) => ({
	removeExisting: false,
	uploadFieldPath: `CloudinaryImage-${props.path}-${++uploadInc}`,
	userSelectedFile: null,
});

module.exports = Field.create({
	propTypes: {
		collapse: PropTypes.bool,
		label: PropTypes.string,
		note: PropTypes.string,
		path: PropTypes.string.isRequired,
		value: PropTypes.shape({
			format: PropTypes.string,
			height: PropTypes.number,
			public_id: PropTypes.string,
			resource_type: PropTypes.string,
			secure_url: PropTypes.string,
			signature: PropTypes.string,
			url: PropTypes.string,
			version: PropTypes.number,
			width: PropTypes.number,
			publicUrl: PropTypes.string,
			filename: PropTypes.string,
			fileKey: PropTypes.string,
			signedUrl: PropTypes.string
		}),
	},
	displayName: 'S3ImageField',
	statics: {
		type: 'S3Image',
		getDefaultValue: () => ({}),
	},
	getInitialState () {
		return buildInitialState(this.props);
	},
	componentWillReceiveProps (nextProps) {
		// console.log('CloudinaryImageField nextProps:', nextProps);
	},
	componentWillUpdate (nextProps) {
		// Reset the action state when the value changes
		// TODO: We should add a check for a new item ID in the store
		if (this.props.value.public_id !== nextProps.value.public_id) {
			this.setState({
				removeExisting: false,
				userSelectedFile: null,
			});
		}
	},

	// ==============================
	// HELPERS
	// ==============================

	hasLocal () {
		return !!this.state.userSelectedFile;
	},
	hasExisting () {
		return !!(this.props.value && this.props.value.publicUrl);
	},
	hasImage () {
		return this.hasExisting() || this.hasLocal();
	},
	getFilename () {
		const { format, height, publicUrl, width } = this.props.value;

		return this.state.userSelectedFile
			? this.state.userSelectedFile.name
			: `${publicUrl}`;//.${format} (${width}×${height})`;
	},
	getImageSource (height = 90) {
		// TODO: This lets really wide images break the layout
		let src;
		src = this.props.value.publicUrl;	
		return src;
	},

	// ==============================
	// METHODS
	// ==============================

	triggerFileBrowser () {
		// this.refs.fileInput.clickDomNode();
		this.uploadInput.click();
	},
	handleFileChange (event) {
		const userSelectedFile = event.target.files[0];

		this.setState({ userSelectedFile });
	},
	onUploadFinish(signResult){
        console.log("Upload finished: ");
        console.log(signResult);
        this.props.value['publicUrl'] = 'http://'+this.bucket_name + '/' + signResult['publicUrl'];
        this.props.value['filename'] = signResult['filename'];
        this.props.value['fileKey'] = signResult['fileKey'];
        this.props.value['signedUrl'] = signResult['signedUrl'];
        this.props.onChange({
			path: this.props.path,
			value: this.props.value,
		});


	},
	// Toggle the lightbox
	openLightbox (event) {
		event.preventDefault();
		this.setState({
			lightboxIsVisible: true,
		});
	},
	closeLightbox () {
		this.setState({
			lightboxIsVisible: false,
		});
	},

	// If we have a local file added then remove it and reset the file field.
	handleRemove (e) {
		var state = {};

		if (this.state.userSelectedFile) {
			state.userSelectedFile = null;
		} else if (this.hasExisting()) {
			state.removeExisting = true;
		}

		this.setState(state);
	},
	undoRemove () {
		this.setState(buildInitialState(this.props));
	},

	// ==============================
	// RENDERERS
	// ==============================

	renderLightbox () {
		const { value } = this.props;

		if (!value || !value.public_id) return;

		return (
			<Lightbox
				currentImage={0}
				images={[{ src: this.getImageSource(600) }]}
				isOpen={this.state.lightboxIsVisible}
				onClose={this.closeLightbox}
				showImageCount={false}
			/>
		);
	},
	renderImagePreview () {
		const { value } = this.props;

		// render icon feedback for intent
		let mask;
		if (this.hasLocal()) mask = 'upload';
		else if (this.state.removeExisting) mask = 'remove';
		else if (this.state.loading) mask = 'loading';

		const shouldOpenLightbox = value.format !== 'pdf';

		return (
			<ImageThumbnail
				component="a"
				href={this.getImageSource(600)}
				onClick={shouldOpenLightbox && this.openLightbox}
				mask={mask}
				target="__blank"
				style={{ float: 'left', marginRight: '1em' }}
			>
				<img src={this.getImageSource()} style={{ height: 90 }} />
			</ImageThumbnail>
		);
	},
	renderFileNameAndOptionalMessage (showChangeMessage = false) {
		return (
			<div>
				{this.hasImage() ? (
					<FileChangeMessage>
						{this.getFilename()}
					</FileChangeMessage>
				) : null}
				{showChangeMessage && this.renderChangeMessage()}
			</div>
		);
	},
	renderChangeMessage () {
		return null;
	},

	// Output [cancel/remove/undo] button
	renderClearButton () {
		const clearText = this.hasLocal() ? 'Cancel' : 'Remove Image';

		return this.state.removeExisting ? (
			<Button variant="link" onClick={this.undoRemove}>
				Undo Remove
			</Button>
		) : (
			<Button variant="link" color="cancel" onClick={this.handleRemove}>
				{clearText}
			</Button>
		);
	},

	renderImageToolbar () {

		console.log(this.props);
		this.bucket_name = this.props.values[this.props.path+"_bucket_name"];
		this.accept_filetype = this.props.values[this.props.path+"_file_type"]||"image/*";
		this.file_key = this.props.values[this.props.path+"_file_key"]||'';
		return (
			<div key={this.props.path + '_toolbar'} className="image-toolbar">
				<ReactS3Uploader
				  	signingUrl="/api/s3/sign"
				    signingUrlMethod="GET"
				    accept={ this.accept_filetype }
				    s3path=""
				    preprocess={this.onUploadStart}
				    onProgress={this.onUploadProgress}
				    onError={this.onUploadError}
				    onFinish={this.onUploadFinish}
				    signingUrlHeaders={{ additional: {} }}
				    signingUrlQueryParams={{ bucket: this.bucket_name, additional: {} }}
				    signingUrlWithCredentials={ true }      // in case when need to pass authentication credentials via CORS
				    uploadRequestHeaders={{ 'x-amz-acl': 'public-read' }}  // this is the default
				    contentDisposition="auto"
				    scrubFilename={(filename) => filename.replace(/[^\w\d_\-.]+/ig, '')}
				    server="http://localhost.com"
				    inputRef={cmp => this.uploadInput = cmp}
				    autoUpload={true}
				    filekey={ this.file_key }
				/>
			    <Button onClick={this.triggerFileBrowser}>
	                    {this.hasImage() ? 'Change' : 'Upload'} Image
	            </Button>
	        
				{this.hasImage() ? this.renderClearButton() : null}
			</div>
		);
	},

	renderFileInput () {
		if (!this.shouldRenderField()) return null;

		return (
			<HiddenFileInput
				accept={SUPPORTED_TYPES.join()}
				ref="fileInput"
				name={this.state.uploadFieldPath}
				onChange={this.handleImageChange}
			/>
		);
	},

	renderActionInput () {
		if (!this.shouldRenderField()) return null;

		// if (this.state.userSelectedFile || this.state.removeExisting || true) {
			// const value = this.state.userSelectedFile
				// ? `upload:${this.state.uploadFieldPath}`
				// : '';
			var value = JSON.stringify(this.props.value) || '';
			return (
				<input
					name={this.getInputName(this.props.path)}
					type="hidden"
					value={value}
				/>
			);
		// } else {
			return null;
		// }
	},

	renderUI () {
		const { label, note, path } = this.props;

		const imageContainer = (
			<div style={this.hasImage() ? { marginBottom: '1em' } : null}>
				{this.hasImage() && this.renderImagePreview()}
				{this.hasImage() && this.renderFileNameAndOptionalMessage(this.shouldRenderField())}
			</div>
		);

		const toolbar = this.shouldRenderField()
			? this.renderImageToolbar()
			: <FormInput noedit />;

		return (
			<FormField label={label} className="field-type-cloudinaryimage" htmlFor={path}>
				{imageContainer}
				{toolbar}
				{!!note && <FormNote note={note} />}
				{this.renderLightbox()}
				{this.renderFileInput()}
				{this.renderActionInput()}
			</FormField>
		);
	},
});

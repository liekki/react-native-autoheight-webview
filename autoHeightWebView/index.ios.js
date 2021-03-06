'use strict'

import React, { PureComponent } from 'react';

import {
    Animated,
    Dimensions,
    StyleSheet,
    View,
    ViewPropTypes,
    WebView
} from 'react-native';

import PropTypes from 'prop-types';

export default class AutoHeightWebView extends PureComponent {
    static propTypes = {
        hasIframe: PropTypes.bool,
        source: WebView.propTypes.source,
        onHeightUpdated: PropTypes.func,
        customScript: PropTypes.string,
        enableAnimation: PropTypes.bool,
        // if set to true may cause some layout issues (smaller font size)
        scalesPageToFit: PropTypes.bool,
        // only works on enable animation
        animationDuration: PropTypes.number,
        // offset of rn webview margin
        heightOffset: PropTypes.number,
        style: ViewPropTypes.style,
        // add web/files... to project root
        files: PropTypes.arrayOf(PropTypes.shape({
            href: PropTypes.string,
            type: PropTypes.string,
            rel: PropTypes.string
        }))
    }

    static defaultProps = {
        scalesPageToFit: false,
        enableAnimation: true,
        animationDuration: 555,
        heightOffset: 12
    }

    constructor(props) {
        super(props);
        this.handleNavigationStateChange = this.handleNavigationStateChange.bind(this);
        if (this.props.enableAnimation) {
            this.opacityAnimatedValue = new Animated.Value(0);
        }
        const initialScript = props.files ? this.appendFilesToHead(props.files, props.hasIframe ? IframeBaseScript : BaseScript) : props.hasIframe ? IframeBaseScript : BaseScript;
        this.state = {
            height: 0,
            script: initialScript
        };
    }

    componentWillReceiveProps(nextProps) {
        let currentScript = nextProps.hasIframe ? IframeBaseScript : BaseScript;
        if (nextProps.files) {
            currentScript = this.appendFilesToHead(nextProps.files, nextProps.hasIframe ? IframeBaseScript : BaseScript);
        }
        this.setState({ script: currentScript });
    }

    appendFilesToHead(files, script) {
        if (!files) {
            return script;
        }
        for (let file of files) {
            script =
                `
                var link  = document.createElement('link');
                link.rel  = '` + file.rel + `';
                link.type = '` + file.type + `';
                link.href = '` + file.href + `';
                document.head.appendChild(link);
                `+ script;
        }
        return script;
    }

    onHeightUpdated(height) {
        if (this.props.onHeightUpdated) {
            this.props.onHeightUpdated(height);
        }
    }

    handleNavigationStateChange(navState) {
        const height = Number(navState.title);
        if (height && height !== this.state.height) {
            if (this.props.enableAnimation) {
                this.opacityAnimatedValue.setValue(0);
            }
            this.setState({ height }, () => {
                if (this.props.enableAnimation) {
                    Animated.timing(this.opacityAnimatedValue, {
                        toValue: 1,
                        duration: this.props.animationDuration
                    }).start(() => this.onHeightUpdated(height));
                }
                else {
                    this.onHeightUpdated(height);
                }
            });
        }
    }

    render() {
        const { height, script } = this.state;
        const { scalesPageToFit, enableAnimation, source, heightOffset, customScript, style } = this.props;
        const webViewSource = Object.assign({}, source, { baseUrl: 'web/' });
        return (
            <Animated.View style={[Styles.container, {
                opacity: enableAnimation ? this.opacityAnimatedValue : 1,
                height: height + heightOffset,
            }, style]}>
                <WebView
                    style={Styles.webView}
                    injectedJavaScript={script + customScript}
                    scrollEnabled={false}
                    scalesPageToFit={scalesPageToFit}
                    source={webViewSource}
                    onNavigationStateChange={this.handleNavigationStateChange} />
            </Animated.View>
        );
    }
}

const ScreenWidth = Dimensions.get('window').width;

const Styles = StyleSheet.create({
    container: {
        width: ScreenWidth,
        backgroundColor: 'transparent'
    },
    webView: {
        flex: 1,
        backgroundColor: 'transparent'
    }
});

const BaseScript =
    `
    ;
    (function () {
        var i = 0;
        var height = 0;
        var wrapper = document.createElement('div');
        wrapper.id = 'height-wrapper';
        while (document.body.firstChild) {
            wrapper.appendChild(document.body.firstChild);
        }
        document.body.appendChild(wrapper);
        function updateHeight() {
            if(document.body.offsetHeight !== height) {
                height = wrapper.clientHeight;
                document.title = wrapper.clientHeight;
                window.location.hash = ++i;
            }
        }
        setTimeout(function() {
            updateHeight();
        }, 1000);
        window.addEventListener('load', updateHeight);
        window.addEventListener('resize', updateHeight);
    } ());
    `;

const IframeBaseScript =
    `
    ;
    (function () {
        var i = 0;
        var height = 0;
        function updateHeight() {
            if(document.body.offsetHeight !== height) {
                height = document.body.firstChild.clientHeight;
                document.title = document.body.firstChild.clientHeight;
                window.location.hash = ++i;
            }
        }
        setTimeout(function() {
            updateHeight();
        }, 1000);
        window.addEventListener('load', updateHeight);
        window.addEventListener('resize', updateHeight);
    } ());
    `;

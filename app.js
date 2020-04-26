// 导入web库
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const fs = require('fs')
const axios = require('axios')
// 处理参数
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
// 导入请求库
const request = require('request')
// 服务端口
const port = 2020

// 设置允许跨域访问该服务
app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Headers', 'mytoken');
    next();
});

// 必应每日一图API地址
const bingAPIURL = 'http://cn.bing.com/HPImageArchive.aspx?'
// 必应图片获取基地址
const bing = 'https://cn.bing.com'

// 请求发送函数
function doRequest(resObj, sendParams) {

    request({
        method: 'GET',
        url: bingAPIURL,
        qs: sendParams
    }, (err, response, body) => {
        if (!err && response.statusCode == 200) {
            // 其他
            if (sendParams.format == 'js') {
                let json = JSON.parse(body)
                json.flag = 1
                // 返回数值
                resObj.json(json)
                console.log(`HTTP200: ${json.images[0].urlbase}`)
            } else if (sendParams.format == 'xml') {
                resObj.format({
                    'application/xml': () => {
                        resObj.send(body)
                    }
                })
            }
        }
        // 获取失败 
        else {
            console.log('BingAPIERR: ', err)
            resObj.send({
                flag: 0,
                msg: 'bing接口错误！'
            })
        }
    })
}

/**
 * HTTP 响应图片
 * @param {res对象} resObj 
 * @param {图片地址} url 
 */
function responseImg(resObj, url) {
    axios.get(url, {
        responseType: 'arraybuffer', //这里只能是arraybuffer，不能是json等其他项，blob也不行
    }).then(response => {
        resObj.set(response.headers) //把整个的响应头塞入更优雅一些
        resObj.end(response.data.toString('binary'), 'binary') //这句是关键，有两次的二进制转换
    })
}

// 主页
app.use('/', express.static('public'))

/**
 * @func 返回bing原生数据
 * @params 
 * format: 返回数据格式
 * npx:    天数偏移量
 * n:      返回图片数量
 * res:    分辨率
 * islong: 是否为竖屏
 */

app.get('/bing', (req, res) => {
    let data = {
        flag: 0,
        msg: ''
    }
    if (req.query.format == undefined) {
        req.query.format = 'js'
    } else if (req.query.format != 'js' && req.query.format != 'xml') {
        data.msg = 'format参数错误！'
        res.json(data)
    }
    if (req.query.idx == undefined) {
        data.msg = 'idx参数不能为空！'
        res.json(data)
        return
    }
    if (req.query.n == undefined) {
        data.msg = 'n参数不能为空！'
        res.json(data)
        return
    }
    let params = {
        format: req.query.format,
        idx: req.query.idx,
        n: req.query.n
    }
    doRequest(res, params)
})

/**
 * @func 展示Bing今日图片
 */
app.get('/showtoday', (req, res) => {
    request(bingAPIURL + 'idx=0&n=1&format=js', (err, response, body) => {
        if (!err && response.statusCode == 200) {
            let json = JSON.parse(body)
            imgsrc = bing + json.images[0].url
            responseImg(res, imgsrc)
        }
    })
})


/**
 * @func 返回今日图片url(支持自定义分辨率)
 * @params
 * res:     分辨率
 * cus:     自定义分辨率
 */

//分辨率 宽屏
let picResolution = [
    '1920x1200',
    '1920x1080',
    '1366x768',
    '1280x768',
    '1280x720',
    '1024x768',
    '800x600',
    '800x480',
    '640x480',
    '400x240',
    '320x240',
    // 竖屏
    '768x1280',
    '720x1280',
    '480x800',
    '240x320'
]

app.get('/today', (req, res) => {

    let params = {
        format: 'js',
        idx: 0,
        n: 1
    }
    let resolution = ''

    // 存在res值，或res，id同时存在
    if (req.query.res != undefined && req.query.res != '') {
        resolution = req.query.res;
    } else {
        // 不存在res,但是存在id值
        if (req.query.id != undefined && req.query.id != '') {
            // 转换为数字
            let resId = parseInt(req.query.id)
            // 检测参数的范围是否正确
            if (resId > picResolution.length -1 || resId < 0) {
                res.send('图片分辨率ID不正确')
                return
            }
            resolution = picResolution[resId]
        }
        // 无任何值，默认返回1920x1080
        else {
            resolution = '1920x1080'
        }
    }
    // 获取图片地址
    request({
        method: 'GET',
        url: bingAPIURL,
        qs: params
    }, (err, response, body) => {
        if (!err && response.statusCode == 200) {
            let json = JSON.parse(body)
            let name = json.images[0].urlbase + '_' + resolution + '.jpg'
            let url = bing + name
            // 获取图片
            responseImg(res, url)
        }
    })
})


/**
 * @func 端口监听&&服务运行函数
 */
app.listen(port, () => {
    console.log(`服务运行在: http://127.0.0.1:${port}/`)
})
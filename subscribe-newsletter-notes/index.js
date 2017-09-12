const request = require("tinyreq")

const slids = ["C2F278094FACCEA62391025B7A52D8EB", "3DC725E303A24F8D9C92271F5026F381"]

request({
    url: "http://www.foxnews.com/portal/newsalertsubscribe",
    headers: {
        "Content-Type": "application/x-www-form-urlencoded"
    },
    data: {
        email: "linda.haviv@gmail.com",
        slids: slids.join(",")
    }
}).then(res => {
    console.log(res.body)
}).catch(err => {
    console.log(err)
})

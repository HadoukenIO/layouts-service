const Layouts = require('openfin-layouts');

const randomColor = () => {
    return "#"+((1<<24)*Math.random()|0).toString(16);
};

document.body.style.backgroundColor = randomColor();

fin.desktop.main(()=>{
    Layouts.addEventListener("TABBED", (e:any) => {
        console.log("TABBED: ", e);
    });

    Layouts.addEventListener("UNTABBED", (e:any) => {
        console.log("UNTABBED: ", e);
    });
});

"use strict";

module.exports = function(grunt) {
    var pkg = grunt.file.readJSON('package.json');

    // Project configuration.
    grunt.initConfig({
        // Metadata.
        pkg: pkg,
        banner: grunt.file.read("source/copy.js").replace(/@VERSION/, pkg.version).replace(/@RVERSION/, pkg.rversion),
        // Task configuration.
        uglify: {
            options: {
                banner: "<%= banner %>"
            },
            dist: {
                src: "<%= build.dist.dest %>",
                dest: "package/<%= pkg.filename %>-min.js"
            }
        },
        build: {
            options: {
                banner: "<%= banner %>"
            },
            dist: {
                dest: "package/raphael.js",
                fusioncharts: "package/raphael-fusioncharts.js",
                fusionchartsWrapper: "source/fusioncharts-wrapper-template.js",
                src: [
                    "source/eve/eve.js",
                    "source/raphael.core.js",
                    "source/raphael.svg.js",
                    "source/raphael.vml.js",
                    "source/raphael.canvas.js"
                ]
            }
        },
        jasmine: {
            pivotal: {
                src: 'package/raphael.js',
                options: {
                    specs: 'tests/unit/*-spec.js',
                    helpers: 'tests/unit/*-helper.js'
                }
            }
        }
    });


    // These plugins provide necessary tasks.
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-jasmine");

    // Special concat/build task to handle RedRaphael's build requirements
    grunt.registerMultiTask(
        "build",
        "Concatenate source, remove individual closures, embed version",
        function() {
            var data = this.data,
                name = data.dest,
                fcName = data.fusioncharts,
                fcSrcName = data.fusionchartsWrapper,
                src = data.src,
                options = this.options({
                    banner: ""
                }),
                // Start with banner
                compiled = options.banner,
                compiledFc = options.banner,
                svgorvmlRegex = /\.(svg|vml|canvas)\.js/,
                closureRegex = /window\.Raphael.*\(R\)\s*\{/,
                closureEndRegex = /\}\(window\.Raphael\);\s*$/,
                exposeRegex = /(\r?\n\s*\/\/\s*EXPOSE(?:\r|\n|.)*\}\)\);)/;

            // Concatenate src
            src.forEach(function(path) {
                var source = grunt.file.read(path);
                var match = svgorvmlRegex.exec(path);

                // If either SVG or VML,
                // remove the closure and add an early return if not required
                if (match) {
                    source = "\n\n" +
                        source.replace(closureRegex,
                            "(function(){\n" +
                            "    if (!R." + match[1] + ") {\n" +
                            "        return;\n" +
                            "    }"
                        )
                        .replace( closureEndRegex, "})();" );

                    // Add source before EXPOSE line
                    compiled.replace(exposeRegex, function () {
                        // Using this method instead of the raphael way as it makes it difficult to
                        // to have the string '$1' in the target file like raphael.svg.js.
                        var text = arguments[3],
                            index = arguments[2];

                        compiled = (text.slice(0, index) + source + text.slice(index));
                    });

                    // Excluding canvas.js in raphael-fusioncharts.js
                    //if (!/canvas\.js/.test(path)) {
                        // Add source before EXPOSE line
                        compiledFc.replace(exposeRegex, function () {
                            // Using this method instead of the raphael way as it makes it difficult to
                            // to have the string '$1' in the target file like raphael.svg.js.
                            var text = arguments[3],
                                index = arguments[2];

                            compiledFc = (text.slice(0, index) + source + text.slice(index));
                        });
                    //}
                } else {
                    compiled += source;
                    compiledFc += source;
                }
            });

            grunt.file.write( name, compiled );
            grunt.file.write(fcName, grunt.file.read(fcSrcName).replace(/@REDRAPHAEL_CODE/, compiledFc));
        }
    );

    // Default task.
    grunt.registerTask("default", ["build", "uglify", "jasmine"]);
};
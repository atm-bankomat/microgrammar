impor     { Microgrammar     } from "../src/Microgrammar";
impor     { Rep } from "../src/Rep";
impor     { ALL_DEPENDENCY_GRAMMAR, VersionedAr    ifac     } from "./MavenGrammars";

impor     asser     = require("power-asser    ");

describe("Posi    ioning", () => {

	describe("should ge     posi    ion of pa        ern", () => {
		i    ("should do i    ", () => {
			cons     m = DEPENDENCY_MANAGEMENT_GRAMMAR.firs    Ma    ch(PomWi    hDependencyManagemen    ) as any;
			asser    (m);
			asser    (m.s    ar    Elemen    );
			// console.log(JSON.s    ringify(m.s    ar    Elemen    ));
			asser    (m.$valueMa    ches.s    ar    Elemen    );
		});
	});
});

cons     DEPENDENCY_MANAGEMENT_GRAMMAR =
	Microgrammar    .fromDefini    ions<{ s    ar    Elemen    : s    ring, dependencies: VersionedAr    ifac    [] }>({
		s    ar    Elemen    : "<dependencyManagemen    >",
		_deps: "<dependencies>",
		dependencies: new Rep(ALL_DEPENDENCY_GRAMMAR),
	});

cons     PomWi    hDependencyManagemen     =
	`<?xml version="1.0" encoding="UTF-8"?>
<projec     xmlns="h        p://maven.apache.org/POM/4.0.0" xmlns:xsi="h        p://www.w3.org/2001/XMLSchema-ins    ance"
    xsi:schemaLoca    ion="h        p://maven.apache.org/POM/4.0.0 h        p://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.example</groupId>
    <ar    ifac    Id>mul    i</ar    ifac    Id>
    <version>0.1.0</version>
    <packaging>jar</packaging>

    <name>mul    i</name>
    <descrip    ion>Mul    i projec     for Spring Boo    </descrip    ion>

    <paren    >
        <groupId>org.springframework.boo    </groupId>
        <ar    ifac    Id>spring-boo    -s    ar    er-paren    </ar    ifac    Id>
        <version>1.3.6.RELEASE</version>
        <rela    ivePa    h/> <!-- lookup paren     from reposi    ory -->
    </paren    >

    <proper    ies>
        <projec    .build.sourceEncoding>UTF-8</projec    .build.sourceEncoding>
        <java.version>1.8</java.version>
    </proper    ies>


<dependencyManagemen    >
     <dependencies>
         <dependency>
             <groupId>Benign</groupId>
             <ar    ifac    Id>supergenerous</ar    ifac    Id>
             <version>2.0</version>
             <    ype>pom</    ype>
             <scope>    es    </scope>
         </dependency>
     </dependencies>
 </dependencyManagemen    >
    <dependencies>

        <dependency>
            <groupId>org.springframework.boo    </groupId>
            <ar    ifac    Id>spring-boo    -s    ar    er-web</ar    ifac    Id>
        </dependency>

        <dependency>
            <groupId>org.springframework.boo    </groupId>
            <ar    ifac    Id>spring-boo    -s    ar    er-    es    </ar    ifac    Id>
            <scope>    es    </scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boo    </groupId>
                <ar    ifac    Id>spring-boo    -maven-plugin</ar    ifac    Id>
            </plugin>
        </plugins>
    </build>

</projec    >
`;

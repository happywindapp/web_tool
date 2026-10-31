const DRAWIO_SAMPLES = {
  flow: ["Flowchart — sơ đồ luồng", `<mxfile>
  <diagram name="Order flow">
    <mxGraphModel dx="800" dy="500" grid="1" gridSize="10">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="start" value="Enter order" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
          <mxGeometry x="40" y="80" width="120" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="check" value="Enough balance?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;" vertex="1" parent="1">
          <mxGeometry x="220" y="60" width="140" height="100" as="geometry"/>
        </mxCell>
        <mxCell id="send" value="Send to exchange" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1">
          <mxGeometry x="420" y="80" width="120" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="reject" value="Reject" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;" vertex="1" parent="1">
          <mxGeometry x="230" y="220" width="120" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="e1" edge="1" parent="1" source="start" target="check"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e2" value="Yes" edge="1" parent="1" source="check" target="send"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="e3" value="No" edge="1" parent="1" source="check" target="reject"><mxGeometry relative="1" as="geometry"/></mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`],
  architecture: ["Kiến trúc hệ thống", `<mxfile>
  <diagram name="Architecture">
    <mxGraphModel dx="800" dy="500" grid="1" gridSize="10">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="box" value="Platform" style="swimlane;html=1;" vertex="1" parent="1">
          <mxGeometry x="220" y="40" width="300" height="240" as="geometry"/>
        </mxCell>
        <mxCell id="api" value="API gateway" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="box">
          <mxGeometry x="90" y="50" width="120" height="50" as="geometry"/>
        </mxCell>
        <mxCell id="svc" value="Order service" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="box">
          <mxGeometry x="90" y="150" width="120" height="50" as="geometry"/>
        </mxCell>
        <mxCell id="user" value="Customer" style="shape=umlActor;verticalLabelPosition=bottom;html=1;" vertex="1" parent="1">
          <mxGeometry x="60" y="110" width="40" height="70" as="geometry"/>
        </mxCell>
        <mxCell id="db" value="Orders DB" style="shape=cylinder3;whiteSpace=wrap;html=1;size=12;" vertex="1" parent="1">
          <mxGeometry x="600" y="180" width="80" height="90" as="geometry"/>
        </mxCell>
        <mxCell id="a" edge="1" parent="1" source="user" target="api"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="b" edge="1" parent="box" source="api" target="svc"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="c" edge="1" parent="1" source="svc" target="db"><mxGeometry relative="1" as="geometry"/></mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`],
  broken: ["Mã lỗi — thử báo lỗi", `<mxfile>
  <diagram name="Broken">
    <mxGraphModel>
      <root>
        <mxCell id="0"
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`],
};

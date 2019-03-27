import {appearancesToFragment} from "./appearancesToFragment";

describe('appearancesToFragment', function () {
    it('simple case', function () {
        const appearances = [
            'id',
            'field1.id',
            'field2.field1',
            'field2.field2',
            'field2',
            'field3.relation.ids.value',
            'field3.relation.ids.index',
            'field3.relation.ids2.value',
            'field3.relation.ids2.index',
            'field3.relation.ids2.index1',
            'field3.relation.ids2.index2',
            'field3.relation.ids2.index3',
            'field3.relation.ids2.index4',
        ]
        const frag = appearancesToFragment(appearances, 'FragmentName', 'Type')
        console.log(`Frag: `, frag);
    });
});

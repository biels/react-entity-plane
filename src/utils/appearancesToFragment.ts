import _ from "lodash";

export const appearancesToFragment = (appearances, name, type) => {
    let tree = {}
    appearances.forEach(appearance => {
        if (!_.get(tree, appearance)) _.set(tree, appearance, null)
    })
    const toFragment = ([key, value]) => {
        if (value == null) {
            return key;
        }
        return [`${key} {`,
            `${_.entries(value).map(e => toFragment(e).split('\n').map((s, i, a) => (i === 0 || i + 1 === a.length) ? '\n' + s : '\n   ' + s).join('')).join('')}`,
            '\n}'].join('')
    }
    return toFragment([`fragment ${name} on ${type}`, tree]).split('\n').map((s, i, a) => (i === 0 || i + 1 === a.length) ? '\n' + s : '\n   ' + s).join('').trim()
}

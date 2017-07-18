/**
 * There are some sets of test around extended ascii chars, utf-ignored chars - we'll excluded those test cases.
 */
const excludedWords = [
  `apéritif	`,
  `APÉRITIF	`,
  `�o��o�`,
  `k�nnysz�m�t�s`,
  `hossznyel�s`,
  `v�zszer`,
  `m��ig`,
  `M��ig`,
  `M�SSIG`,
  `Aussto�`,
  `Absto�.`,
  `Au�enabmessung`,
  `Prozessionsstra�e`,
  `Au�enma�e`,
  `�r`,
  `�ram`,
  `�rach`,
  `�diter`,
  `c�ur`,
  `�uvre`,
  `C�UR`,
  `�UVRE`,
  `طير	`,
  `فتحة	`,
  `ضمة	`,
  `كسرة	`,
  `فتحتان	`,
  `ضمتان	`,
  `كسرتان	`,
  `شدة	`,
  `سكون	`,
  `𐏑	`,
  `𐏒	`,
  `𐏒𐏑	`,
  `𐏒𐏒	`,
  `vinteún`,
  `vinte e un`
];

export { excludedWords };

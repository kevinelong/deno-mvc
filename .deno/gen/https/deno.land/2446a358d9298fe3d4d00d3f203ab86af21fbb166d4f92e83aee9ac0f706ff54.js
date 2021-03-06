import * as path from "../path/mod.ts";
export function isSubdir(src, dest, sep = path.sep) {
    if (src === dest) {
        return false;
    }
    const srcArray = src.split(sep);
    const destArray = dest.split(sep);
    return srcArray.every((current, i) => destArray[i] === current);
}
export function getFileInfoType(fileInfo) {
    return fileInfo.isFile
        ? "file"
        : fileInfo.isDirectory
            ? "dir"
            : fileInfo.isSymlink
                ? "symlink"
                : undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiX3V0aWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJfdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEtBQUssSUFBSSxNQUFNLGdCQUFnQixDQUFDO0FBUXZDLE1BQU0sVUFBVSxRQUFRLENBQ3RCLEdBQVcsRUFDWCxJQUFZLEVBQ1osTUFBYyxJQUFJLENBQUMsR0FBRztJQUV0QixJQUFJLEdBQUcsS0FBSyxJQUFJLEVBQUU7UUFDaEIsT0FBTyxLQUFLLENBQUM7S0FDZDtJQUNELE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDaEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNsQyxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssT0FBTyxDQUFDLENBQUM7QUFDbEUsQ0FBQztBQVVELE1BQU0sVUFBVSxlQUFlLENBQUMsUUFBdUI7SUFDckQsT0FBTyxRQUFRLENBQUMsTUFBTTtRQUNwQixDQUFDLENBQUMsTUFBTTtRQUNSLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVztZQUN0QixDQUFDLENBQUMsS0FBSztZQUNQLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUztnQkFDcEIsQ0FBQyxDQUFDLFNBQVM7Z0JBQ1gsQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUNoQixDQUFDIn0=